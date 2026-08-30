package expo.modules.ibadahnative

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat

/**
 * The foreground `Service` that actually rings. Started only by
 * [WakeAlarmReceiver] (an `AlarmManager` alarm firing) or by itself resuming
 * after a process kill (see the `START_STICKY` note below) — never started
 * directly by JS.
 *
 * ## Foreground service type: `mediaPlayback`, not a bespoke "alarm" type
 * There is no `alarmClock` (or similar) foreground-service type in Android
 * 14's (API 34) type enum — the real options relevant here are
 * `mediaPlayback` (no runtime eligibility conditions, exactly describes
 * "playing an audio file from the background") and `specialUse` /
 * `systemExempted` (each gated behind its own eligibility list, e.g.
 * `systemExempted` requires holding `SCHEDULE_EXACT_ALARM`/`USE_EXACT_ALARM`
 * — this app does hold `SCHEDULE_EXACT_ALARM`, so `systemExempted` would
 * also be legal, but `mediaPlayback` is the narrower, purpose-built,
 * zero-eligibility-condition type for exactly what this service does, so it
 * is the safer long-term choice — see this module's `AndroidManifest.xml`
 * for the matching `android:foregroundServiceType="mediaPlayback"`
 * declaration and the `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission it
 * requires).
 *
 * ## Never stops itself
 * Per this task's explicit requirement: nothing in this class ever calls
 * `stopSelf()`/`stopForeground()` on a timer, only in direct response to an
 * `ACTION_STOP` command — which [IbadahNativeModule.stopWakeAlarmRinging]
 * (a documented *addition* to this module's base JS interface — see this
 * module's report) is the only caller of. `onDestroy` below is a leak-safety
 * net for the media player / wake lock, not a stop path.
 *
 * ## `START_STICKY`
 * If the OS kills this service's process outright (memory pressure — a real
 * possibility while a locked/asleep device is under load), returning
 * `START_STICKY` asks the platform to recreate it once resources allow, with
 * a `null` intent (no `alarmId` extra). [WakeAlarmPrefs.loadRinging] is the
 * fallback for exactly that case, so the alarm keeps ringing rather than
 * silently going quiet from a kill that had nothing to do with the user
 * scanning anything.
 */
class WakeAlarmRingingService : Service() {
  private var mediaPlayer: MediaPlayer? = null
  private var wakeLock: PowerManager.WakeLock? = null
  private var currentAlarmId: String? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      val id = intent.getStringExtra(WakeAlarmScheduler.EXTRA_ALARM_ID) ?: currentAlarmId
      // startForegroundService() (see IbadahNativeModule.stopWakeAlarmRinging)
      // requires startForeground() within ~5s of *any* start, including one
      // that only means to stop — satisfy that with the same ringing
      // notification (it's about to be torn down immediately after) rather
      // than skip it and risk an ANR-style "did not call startForeground"
      // crash if this service happened to not already be foregrounded.
      if (id != null) startForeground(NOTIFICATION_ID, buildNotification(id))
      stopRinging(id)
      return START_NOT_STICKY
    }

    val extraId = intent?.getStringExtra(WakeAlarmScheduler.EXTRA_ALARM_ID)
    val extraSound = intent?.getStringExtra(WakeAlarmScheduler.EXTRA_SOUND_NAME)
    val resumed = extraId == null
    val id = extraId ?: WakeAlarmPrefs.loadRinging(applicationContext)?.first
    val soundName = extraSound ?: WakeAlarmPrefs.loadRinging(applicationContext)?.second

    if (id == null) {
      // Restarted with nothing to resume (e.g. it had already been stopped
      // before the process died) — nothing to do.
      stopSelf()
      return START_NOT_STICKY
    }

    currentAlarmId = id
    WakeAlarmPrefs.saveRinging(applicationContext, id, soundName)

    startForeground(NOTIFICATION_ID, buildNotification(id))
    if (!resumed || mediaPlayer == null) startRingtone(soundName)
    acquireWakeLock()

    if (!resumed) WakeAlarmEventBus.onFired?.invoke(id)

    return START_STICKY
  }

  private fun startRingtone(soundName: String?) {
    mediaPlayer?.let {
      try { it.stop() } catch (_: Exception) {}
      it.release()
    }

    val player = MediaPlayer()
    player.setAudioAttributes(
      AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
    )
    player.isLooping = true

    try {
      // `soundName` (if provided) is looked up as a raw resource *in the
      // host app*, not this module (this local module ships no bundled
      // sounds of its own) — e.g. a custom adhan/alarm sound the app
      // bundles at res/raw/<soundName>.mp3. Falls back to the device's
      // default alarm ringtone when absent or not found, so scheduling
      // never fails outright for a missing sound asset.
      val customResId = soundName?.let {
        resources.getIdentifier(it, "raw", packageName).takeIf { id -> id != 0 }
      }
      if (customResId != null) {
        resources.openRawResourceFd(customResId).use { afd ->
          player.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length)
        }
      } else {
        val uri = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM)
          ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        player.setDataSource(this, uri)
      }
      player.prepare()
      player.start()
    } catch (e: Exception) {
      // Deliberately not fatal: the full-screen notification / activity
      // still wakes the user even if audio playback fails for some reason
      // (e.g. no default alarm ringtone configured on a stripped-down ROM).
      Log.e(TAG, "Failed to start wake-alarm ringtone; continuing without audio.", e)
    }

    mediaPlayer = player
  }

  private fun acquireWakeLock() {
    if (wakeLock?.isHeld == true) return
    val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
    wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "IbadahNative:WakeAlarmRinging").apply {
      setReferenceCounted(false)
      // A leak-safety ceiling only — NOT the ring's stop condition. Actively
      // looping audio through a real AudioTrack keeps the device from a full
      // suspend on its own (the audio HAL holds its own wakelock while a
      // track is playing), so this partial wake lock mainly covers the
      // brief window between the alarm firing and the full-screen intent
      // turning the screen on. If somehow nothing ever calls
      // stopWakeAlarmRinging and this timeout is hit, audio/notification
      // both keep running regardless — only this specific CPU wake lock
      // would expire.
      acquire(30 * 60 * 1000L)
    }
  }

  private fun buildNotification(id: String): Notification {
    ensureChannel()

    val bridgeIntent = Intent(this, WakeAlarmFullScreenActivity::class.java).apply {
      putExtra(WakeAlarmScheduler.EXTRA_ALARM_ID, id)
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    }
    val fullScreenPendingIntent = PendingIntent.getActivity(
      this,
      id.hashCode(),
      bridgeIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )

    val builder = NotificationCompat.Builder(this, CHANNEL_ID)
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setContentTitle("Wake up for prayer")
      .setContentText("Scan your prayer mat tag to stop the alarm.")
      .setPriority(NotificationCompat.PRIORITY_MAX)
      .setCategory(NotificationCompat.CATEGORY_ALARM)
      .setOngoing(true)
      .setAutoCancel(false)
      // Deliberately no dismiss/snooze action — per this task's requirement,
      // there is no way to silence this from the notification itself, only
      // by completing the scan flow it points at.
      .setContentIntent(fullScreenPendingIntent)

    // Android 14+ (API 34): USE_FULL_SCREEN_INTENT must additionally be
    // *granted*, not just declared — check before relying on it, and degrade
    // to a normal (still high-priority/heads-up) notification rather than
    // silently doing nothing if it isn't. See
    // https://developer.android.com/develop/ui/views/notifications/time-sensitive.
    val canFullScreen = if (Build.VERSION.SDK_INT >= 34) {
      (getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).canUseFullScreenIntent()
    } else {
      true
    }
    if (canFullScreen) {
      builder.setFullScreenIntent(fullScreenPendingIntent, true)
    }

    return builder.build()
  }

  private fun ensureChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(CHANNEL_ID, "Wake alarm", NotificationManager.IMPORTANCE_HIGH).apply {
      description = "The prayer wake-up alarm that rings until you scan your prayer mat tag."
      // The MediaPlayer above is the actual audio source (USAGE_ALARM,
      // looping) — silence the channel's own notification sound so it
      // doesn't play a second, overlapping sound on top of it.
      setSound(null, null)
      enableVibration(true)
    }
    manager.createNotificationChannel(channel)
  }

  private fun stopRinging(id: String?) {
    mediaPlayer?.let {
      try { it.stop() } catch (_: Exception) {}
      try { it.release() } catch (_: Exception) {}
    }
    mediaPlayer = null

    wakeLock?.let { if (it.isHeld) it.release() }
    wakeLock = null

    WakeAlarmPrefs.clearRinging(applicationContext)

    stopForeground(STOP_FOREGROUND_REMOVE)
    NotificationManagerCompat.from(this).cancel(NOTIFICATION_ID)

    val dismissedId = id ?: currentAlarmId
    currentAlarmId = null
    if (dismissedId != null) WakeAlarmEventBus.onDismissed?.invoke(dismissedId)

    stopSelf()
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    // Deliberately a no-op (not overridden to stopSelf()): the default
    // platform behavior already keeps a started foreground service alive
    // when its host app's task is swiped from recents, which is exactly
    // what "won't stop until verified" requires. See this module's report
    // for the real caveat this does NOT protect against: some OEM battery
    // managers (MIUI/ColorOS/EMUI and similar) kill backgrounded processes
    // more aggressively than stock Android regardless of foreground-service
    // status, independent of anything this code can control.
  }

  override fun onDestroy() {
    // Leak-safety net only, not a stop path: if the whole process is torn
    // down without going through stopRinging() (e.g. an OEM task killer),
    // release what we're holding so we don't leak a MediaPlayer/WakeLock —
    // but deliberately do NOT clear WakeAlarmPrefs' ringing record here,
    // so a subsequent START_STICKY-driven restart still knows to resume
    // ringing rather than silently going quiet.
    mediaPlayer?.let { try { it.release() } catch (_: Exception) {} }
    wakeLock?.let { if (it.isHeld) it.release() }
    super.onDestroy()
  }

  companion object {
    private const val TAG = "WakeAlarmRingingService"
    private const val CHANNEL_ID = "ibadah-wake-alarm"
    private const val NOTIFICATION_ID = 7301

    /** Extra service action: tears down ringing for the alarm id carried in
     * `EXTRA_ALARM_ID` (or whichever alarm is currently ringing, if that
     * extra is absent). The only way this service ever stops. */
    const val ACTION_STOP = "expo.modules.ibadahnative.action.STOP_WAKE_ALARM_RINGING"
  }
}
