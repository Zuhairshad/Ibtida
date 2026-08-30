package expo.modules.ibadahnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * The `PendingIntent` target `WakeAlarmScheduler.schedule()` hands to
 * `AlarmManager.setAlarmClock()`. Runs only when the platform actually fires
 * the alarm — this is the hand-off point from "OS-level exact alarm" to
 * "our own foreground service takes over".
 *
 * Starting a foreground service from here (a `BroadcastReceiver` reacting to
 * a background alarm) is exactly the case Android's background-service-start
 * restrictions (API 26+) explicitly exempt: "Your app invokes an exact alarm
 * to complete an action that the user requests" — see
 * https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start.
 * The exact alarm this app itself scheduled via `setAlarmClock()` is that
 * invocation; this receiver reacting to it, however long after the fact the
 * device is asleep, is covered by the same exemption, not a fresh
 * "starting a service from nothing" attempt.
 */
class WakeAlarmReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != WakeAlarmScheduler.ACTION_WAKE_ALARM_FIRED) return

    val id = intent.getStringExtra(WakeAlarmScheduler.EXTRA_ALARM_ID)
    if (id == null) {
      Log.w(TAG, "Received a wake-alarm-fired broadcast with no alarm id; ignoring.")
      return
    }
    val soundName = intent.getStringExtra(WakeAlarmScheduler.EXTRA_SOUND_NAME)

    // AlarmManager alarms are one-shot and already consumed by the time this
    // runs. Also drop our own reboot-survival record for it now (rather than
    // waiting for a `cancelWakeAlarm` that may never come — the caller only
    // cancels *pending* alarms, this one already fired) so a later reboot
    // doesn't try to re-schedule an occurrence that already happened today.
    WakeAlarmPrefs.removeScheduled(context.applicationContext, id)

    val serviceIntent = Intent(context, WakeAlarmRingingService::class.java).apply {
      putExtra(WakeAlarmScheduler.EXTRA_ALARM_ID, id)
      putExtra(WakeAlarmScheduler.EXTRA_SOUND_NAME, soundName)
    }
    ContextCompat.startForegroundService(context, serviceIntent)
  }

  companion object {
    private const val TAG = "WakeAlarmReceiver"
  }
}
