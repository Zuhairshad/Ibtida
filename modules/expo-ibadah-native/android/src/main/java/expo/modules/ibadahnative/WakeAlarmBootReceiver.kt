package expo.modules.ibadahnative

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Re-registers every still-pending wake alarm with a fresh `AlarmManager`
 * after a device reboot. Necessary because `AlarmManager` does not persist
 * any alarms across a reboot — this is standard, documented Android
 * behavior (`AlarmManager`'s own class docs: "All alarms are cancelled when
 * the device shuts down"), not something specific to this app or fixable any
 * other way than re-scheduling from our own durable record
 * ([WakeAlarmPrefs]) once the OS tells us it has booted.
 *
 * Listens for `ACTION_BOOT_COMPLETED`, which — per
 * https://developer.android.com/develop/background-work/services/fgs/restrictions-bg-start
 * — is itself one of the documented exemptions letting an app act
 * (including, if ever needed, starting a foreground service) immediately
 * after a fresh boot without any prior user-visible activity.
 *
 * See [WakeAlarmPrefs]'s class doc comment for the one known gap this still
 * has: on a securely-locked device, this receiver cannot read its own
 * `SharedPreferences` until the user unlocks at least once post-reboot,
 * since it isn't using device-protected storage / `ACTION_LOCKED_BOOT_COMPLETED`.
 */
class WakeAlarmBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != Intent.ACTION_BOOT_COMPLETED) return

    val appContext = context.applicationContext
    val now = System.currentTimeMillis()

    // Re-scheduling here does not need its own canScheduleExactAlarms()
    // gate: if the permission were later revoked by the user, that already
    // happened independently of this reboot, and AlarmManager itself would
    // simply reject the setAlarmClock() call — caught and logged below
    // rather than crashing this receiver for every other pending alarm.
    for ((id, entry) in WakeAlarmPrefs.allScheduled(appContext)) {
      val (whenEpochMs, soundName) = entry
      if (whenEpochMs <= now) {
        // Elapsed while the device was off/rebooting — drop rather than
        // fire a stale alarm days later. The JS side (src/services/
        // wakeAlarm.ts, `prayer_alarm_settings`) re-derives and re-schedules
        // the next real occurrence the next time the app itself runs.
        WakeAlarmPrefs.removeScheduled(appContext, id)
        continue
      }
      try {
        WakeAlarmScheduler.schedule(appContext, id, whenEpochMs, soundName)
      } catch (e: Exception) {
        Log.w(TAG, "Failed to re-schedule wake alarm '$id' after boot.", e)
      }
    }
  }

  companion object {
    private const val TAG = "WakeAlarmBootReceiver"
  }
}
