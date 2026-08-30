package expo.modules.ibadahnative

import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat
import expo.modules.kotlin.exception.CodedException

/**
 * The facade [IbadahNativeModule] calls for every wake-alarm function —
 * kept as a separate object so that shared `Module` file only needs a
 * one-line call per function (see this module's report: `IbadahNativeModule.kt`
 * is also being edited by a sibling agent for app-blocking in this same
 * batch, so this file's whole purpose is to keep that shared file's diff
 * minimal).
 */
internal object WakeAlarmController {
  fun isSupported(): Boolean = true

  /** Throws a [CodedException] if exact-alarm scheduling isn't currently
   * permitted (see [WakeAlarmScheduler]'s class doc comment on
   * `SCHEDULE_EXACT_ALARM` vs `USE_EXACT_ALARM`) — callers should catch this
   * and, if desired, call [openExactAlarmSettings] to send the user to grant
   * it, then retry. Otherwise schedules via [WakeAlarmScheduler] and records
   * it in [WakeAlarmPrefs] so [WakeAlarmBootReceiver] can restore it after a
   * reboot. */
  fun schedule(context: Context, id: String, whenEpochMs: Long, soundName: String?) {
    if (!WakeAlarmScheduler.canScheduleExactAlarms(context)) {
      throw CodedException(
        "ERR_IBADAH_NATIVE_EXACT_ALARM_PERMISSION",
        "Exact alarm scheduling is not permitted yet. Call openExactAlarmSettings() " +
          "to send the user to grant it (Settings > Alarms & reminders), then retry.",
        null
      )
    }
    WakeAlarmScheduler.schedule(context, id, whenEpochMs, soundName)
    WakeAlarmPrefs.saveScheduled(context, id, whenEpochMs, soundName)
  }

  fun cancel(context: Context, id: String) {
    WakeAlarmScheduler.cancel(context, id)
    WakeAlarmPrefs.removeScheduled(context, id)
  }

  /** Opens the system screen for granting `SCHEDULE_EXACT_ALARM` (API 31+;
   * a no-op Intent that resolves to nothing meaningful below that, where no
   * such permission gate exists in the first place — guarded by the caller
   * checking `Build.VERSION.SDK_INT`, kept here as a plain best-effort
   * `ACTION_REQUEST_SCHEDULE_EXACT_ALARM` launch either way since the OS
   * itself simply no-ops the intent on older versions rather than crashing).
   * Documented **addition** beyond this module's base `index.ts` contract —
   * see this module's report to the UI-wiring agent. */
  fun openExactAlarmSettings(context: Context) {
    val intent = Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM).apply {
      data = android.net.Uri.parse("package:${context.packageName}")
      addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
  }

  /** Documented **addition** beyond this module's base `index.ts` contract:
   * tells the currently-ringing (or previously-ringing, for idempotency)
   * `WakeAlarmRingingService` to stop — the only thing in this feature that
   * ever does. Safe to call when nothing is ringing. */
  fun stopRinging(context: Context, id: String) {
    val intent = Intent(context, WakeAlarmRingingService::class.java).apply {
      action = WakeAlarmRingingService.ACTION_STOP
      putExtra(WakeAlarmScheduler.EXTRA_ALARM_ID, id)
    }
    ContextCompat.startForegroundService(context, intent)
  }
}
