package expo.modules.ibadahnative

/**
 * In-process pub/sub bridging the wake-alarm native components — none of
 * which are the `Module` itself (`WakeAlarmReceiver` is a `BroadcastReceiver`
 * the OS drives when `AlarmManager` fires, and `WakeAlarmRingingService` is a
 * foreground `Service` the receiver starts) — back to whichever
 * `IbadahNativeModule` instance is currently alive, so JS's
 * `addWakeAlarmEventListener` (see index.ts's `NativeWakeAlarmEvent`) has
 * something to fire from.
 *
 * Mirrors [BlockingEventBus] exactly (see that file's doc comment for why a
 * plain in-process callback — no cross-process IPC — is sufficient: this
 * module's `Service`/`BroadcastReceiver` all run in the app's main process,
 * since neither this module's manifest nor the receiver/service declarations
 * below opt into `android:process`).
 *
 * Both callbacks are intentionally allowed to be `null`: the ringing service
 * can be alive and correctly looping the alarm sound with no JS runtime
 * around to listen at all (e.g. the alarm fired while the app was fully
 * killed) — firing into a `null` listener here is a normal, expected no-op.
 * The JS side finds out about a `'fired'` alarm it missed the live event for
 * anyway, because the full-screen notification / full-screen-intent activity
 * itself is what actually wakes the user and hands off into
 * `WakeScanScreen` (see `WakeAlarmFullScreenActivity`) — this bus is a
 * best-effort "also tell JS if it happens to already be running", not the
 * only path to the user noticing the alarm.
 */
internal object WakeAlarmEventBus {
  /** Fired once `WakeAlarmRingingService` actually starts ringing for a
   * given alarm `id` — i.e. once `AlarmManager` has delivered the alarm and
   * the foreground service has taken over. Carries the alarm `id` so JS can
   * match it against `prayer_alarm_settings` rows (see
   * `src/services/wakeAlarm.ts`). */
  @Volatile
  var onFired: ((id: String) -> Unit)? = null

  /** Fired once ringing has actually stopped for `id` — audio loop ended and
   * the notification cleared. This only ever happens in response to an
   * explicit JS call to `stopWakeAlarmRinging(id)` (see
   * `IbadahNativeModule`'s doc comment on that function for why: the whole
   * point of this feature is that nothing else — not a timeout, not the user
   * swiping the notification away — is allowed to stop it). */
  @Volatile
  var onDismissed: ((id: String) -> Unit)? = null
}
