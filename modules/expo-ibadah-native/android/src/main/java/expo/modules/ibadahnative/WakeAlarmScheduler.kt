package expo.modules.ibadahnative

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build

/**
 * Thin wrapper around the platform `AlarmManager` for the wake-verified
 * prayer alarm. Pure scheduling mechanics live here; [WakeAlarmController] is
 * the higher-level facade [IbadahNativeModule] actually calls (it also owns
 * persisting to [WakeAlarmPrefs] for reboot survival — kept out of this file
 * so this one stays a narrow, testable wrapper around exactly the
 * `AlarmManager` APIs).
 *
 * ## Why `setAlarmClock()` and not `setExact()` / `setExactAndAllowWhileIdle()`
 * All three schedule a one-shot alarm for a precise instant, but only
 * `setAlarmClock()` is documented as **never** deferred for Doze / App
 * Standby / battery saver — the platform will fully wake the device for it
 * regardless of power-saving state — and it is Android's own documented
 * recommendation for "an alarm clock app" specifically (see
 * https://developer.android.com/develop/background-work/services/alarms/schedule,
 * "Alarms that fire at a precise, user-visible time" / the `setAlarmClock`
 * doc). It also puts the standard "next alarm" indicator in the status bar
 * and lock screen, which is exactly the transparency a real alarm clock
 * should have — nothing here tries to hide that the app has an alarm
 * pending. A prayer wake alarm is precisely this use case, not a background
 * "wake up periodically to sync/check something" use case `setExact...`
 * exists for.
 *
 * ## Permission: `SCHEDULE_EXACT_ALARM`, not `USE_EXACT_ALARM`
 * Starting with apps targeting Android 13 (API 33) on an Android 14+ device,
 * scheduling any exact alarm (`setAlarmClock()` included — this is not
 * limited to `setExact...`) requires the app to hold the
 * `SCHEDULE_EXACT_ALARM` permission, checked at call time via
 * `AlarmManager#canScheduleExactAlarms()`. Android does offer an
 * auto-granted alternative, `USE_EXACT_ALARM`, but Google Play policy
 * restricts that one to apps whose **core function** is an alarm clock or
 * calendar app — Ibtida is a broader prayer-companion app with the wake
 * alarm as one feature among several (prayer times, adhkar, app-blocking),
 * so it does not qualify, and declaring `USE_EXACT_ALARM` here would risk a
 * Play Console policy rejection. `SCHEDULE_EXACT_ALARM` (revocable,
 * explicitly granted by the user via Settings) is the correct, policy-safe
 * choice — see [WakeAlarmController.canScheduleExactAlarms] /
 * `openExactAlarmSettings` for the check-and-guide-to-Settings flow this
 * implies.
 */
internal object WakeAlarmScheduler {
  const val ACTION_WAKE_ALARM_FIRED = "expo.modules.ibadahnative.action.WAKE_ALARM_FIRED"
  const val EXTRA_ALARM_ID = "expo.modules.ibadahnative.extra.ALARM_ID"
  const val EXTRA_SOUND_NAME = "expo.modules.ibadahnative.extra.SOUND_NAME"

  /** Same deep link this pass's sibling agents were told the JS side will
   * route from (`ibtida://wake-scan?alarmId=...`, matching app.json's
   * `"scheme": "ibtida"`) — used both as `AlarmClockInfo`'s required "show"
   * intent (what the system's own alarm-clock UI opens if the user taps the
   * status-bar alarm icon) and, from [WakeAlarmFullScreenActivity], as the
   * actual hand-off into the RN app once the alarm fires. */
  fun wakeScanDeepLinkUri(alarmId: String): Uri =
    Uri.parse("ibtida://wake-scan").buildUpon().appendQueryParameter("alarmId", alarmId).build()

  fun canScheduleExactAlarms(context: Context): Boolean {
    // No permission gate at all below API 31 — SCHEDULE_EXACT_ALARM and
    // canScheduleExactAlarms() were both introduced in API 31.
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S) return true
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    return alarmManager.canScheduleExactAlarms()
  }

  /** Schedules (or replaces, if `id` is already pending — same `PendingIntent`
   * request code, so `AlarmManager` treats it as the same alarm slot) a
   * one-shot alarm for `whenEpochMs`. Caller (`WakeAlarmController`) is
   * responsible for the `canScheduleExactAlarms()` gate — kept out of this
   * function so [WakeAlarmBootReceiver] can also call this directly for
   * already-granted alarms without re-deriving that check. */
  fun schedule(context: Context, id: String, whenEpochMs: Long, soundName: String?) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    val operation = firedPendingIntent(context, id, soundName)
    val showIntent = showPendingIntent(context, id)
    alarmManager.setAlarmClock(AlarmManager.AlarmClockInfo(whenEpochMs, showIntent), operation)
  }

  /** Cancels a pending alarm for `id`. Safe to call when nothing is
   * scheduled under that id — `AlarmManager#cancel` on a `PendingIntent` that
   * doesn't (or no longer) match anything pending is a documented no-op, not
   * an error. */
  fun cancel(context: Context, id: String) {
    val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as AlarmManager
    // Only the target component + action + request code need to match for
    // AlarmManager to recognize this as the same alarm — extras are not
    // part of that comparison, so omitting `soundName` here is fine.
    alarmManager.cancel(firedPendingIntent(context, id, null))
  }

  /** Stable per-`id` request code so repeated `schedule()`/`cancel()` calls
   * for the same `id` resolve to the same `PendingIntent` slot (mirroring
   * `AlarmManager`'s own id-keyed-alarm semantics, as index.ts's
   * `scheduleWakeAlarm` doc comment promises callers). `String#hashCode()`
   * collisions across different prayer ids are astronomically unlikely for
   * the small, caller-controlled id space this is used with (e.g.
   * `"wake-alarm:Fajr"`). */
  private fun requestCodeFor(id: String): Int = id.hashCode()

  private fun firedPendingIntent(context: Context, id: String, soundName: String?): PendingIntent {
    val intent = Intent(context, WakeAlarmReceiver::class.java).apply {
      action = ACTION_WAKE_ALARM_FIRED
      putExtra(EXTRA_ALARM_ID, id)
      putExtra(EXTRA_SOUND_NAME, soundName)
    }
    return PendingIntent.getBroadcast(
      context,
      requestCodeFor(id),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }

  private fun showPendingIntent(context: Context, id: String): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, wakeScanDeepLinkUri(id)).apply {
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    return PendingIntent.getActivity(
      context,
      requestCodeFor(id),
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
