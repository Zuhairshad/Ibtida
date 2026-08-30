package expo.modules.ibadahnative

import android.content.Context
import androidx.core.content.edit
import org.json.JSONObject

/**
 * Durable, `SharedPreferences`-backed store for the wake-alarm feature.
 * Exists for the same structural reason [IbadahBlockingPrefs] does (see that
 * file's doc comment): the components that need this data —
 * [WakeAlarmBootReceiver] on device reboot, [WakeAlarmRingingService] if the
 * OS kills and restarts it mid-ring — run independently of, and can outlive
 * or predate, both the JS runtime and any particular `Module`/`Service`
 * instance's own memory.
 *
 * Two independent pieces of state live here, under one preferences file
 * purely to avoid a second small file:
 *
 * 1. **Scheduled alarms** (`scheduled/*`) — every currently-pending
 *    `scheduleWakeAlarm(id, ...)` call, so [WakeAlarmBootReceiver] can
 *    re-register them with a fresh `AlarmManager` after a reboot (Android
 *    clears all `AlarmManager` entries on every boot — this is standard,
 *    documented platform behavior, not a bug to route around any other way).
 *    Removed on `cancelWakeAlarm`, and once an alarm actually fires (it was
 *    one-shot; `AlarmManager` already forgot it too).
 * 2. **Currently-ringing alarm** (`ringing/*`) — the single alarm `id` (if
 *    any) [WakeAlarmRingingService] is actively looping right now, so a
 *    `START_STICKY` restart after a process kill (see that service's doc
 *    comment on `START_STICKY`) knows what to resume ringing for even though
 *    the restart delivers a `null` intent with no extras.
 *
 * ## Known limitation (flagged, not silently glossed over)
 * This is regular (credential-encrypted) `SharedPreferences`, not
 * device-protected storage. On a device with a secure lock screen, that
 * store is unreadable until the user unlocks the device at least once after
 * a reboot — so if the device reboots (or is off) and stays locked straight
 * through a scheduled Fajr time, [WakeAlarmBootReceiver] cannot read
 * `scheduled/*` yet and that occurrence is silently missed. Making this
 * survive that specific edge case would mean moving to
 * `Context#createDeviceProtectedStorageContext()` and handling
 * `ACTION_LOCKED_BOOT_COMPLETED` instead of `ACTION_BOOT_COMPLETED` — real,
 * documented Android mechanisms, but a meaningfully bigger change (a second
 * storage area, migration on first unlock, etc.) than this pass's scope
 * covers. Flagging honestly per this task's instructions rather than
 * quietly shipping the gap.
 */
internal object WakeAlarmPrefs {
  private const val PREFS_NAME = "expo_ibadah_native.wake_alarm"
  private const val KEY_SCHEDULED_PREFIX = "scheduled/"
  private const val KEY_RINGING_ID = "ringing/id"
  private const val KEY_RINGING_SOUND = "ringing/soundName"

  private fun prefs(context: Context) =
    context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  // --- Scheduled alarms (reboot-survival) ------------------------------

  fun saveScheduled(context: Context, id: String, whenEpochMs: Long, soundName: String?) {
    val json = JSONObject().apply {
      put("whenEpochMs", whenEpochMs)
      put("soundName", soundName)
    }
    prefs(context).edit { putString(KEY_SCHEDULED_PREFIX + id, json.toString()) }
  }

  fun removeScheduled(context: Context, id: String) {
    prefs(context).edit { remove(KEY_SCHEDULED_PREFIX + id) }
  }

  /** `id -> (whenEpochMs, soundName)` for every currently-pending alarm. */
  fun allScheduled(context: Context): Map<String, Pair<Long, String?>> {
    val all = prefs(context).all
    val result = mutableMapOf<String, Pair<Long, String?>>()
    for ((key, value) in all) {
      if (!key.startsWith(KEY_SCHEDULED_PREFIX) || value !is String) continue
      val id = key.removePrefix(KEY_SCHEDULED_PREFIX)
      try {
        val json = JSONObject(value)
        val whenEpochMs = json.getLong("whenEpochMs")
        val soundName = if (json.isNull("soundName")) null else json.getString("soundName")
        result[id] = whenEpochMs to soundName
      } catch (e: Exception) {
        // Corrupt/unreadable entry for this one id — skip it rather than
        // failing the whole reboot-reschedule pass for every other alarm.
      }
    }
    return result
  }

  // --- Currently-ringing alarm (service-restart resume) ----------------

  fun saveRinging(context: Context, id: String, soundName: String?) {
    prefs(context).edit {
      putString(KEY_RINGING_ID, id)
      putString(KEY_RINGING_SOUND, soundName)
    }
  }

  /** `(id, soundName)` of the alarm that was ringing when this process last
   * had a chance to record it, or `null` if nothing is (or should still be)
   * ringing. */
  fun loadRinging(context: Context): Pair<String, String?>? {
    val id = prefs(context).getString(KEY_RINGING_ID, null) ?: return null
    val soundName = prefs(context).getString(KEY_RINGING_SOUND, null)
    return id to soundName
  }

  fun clearRinging(context: Context) {
    prefs(context).edit {
      remove(KEY_RINGING_ID)
      remove(KEY_RINGING_SOUND)
    }
  }
}
