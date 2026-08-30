package expo.modules.ibadahnative

import android.accessibilityservice.AccessibilityService
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent

/**
 * The actual enforcement mechanism behind "Ibadah Lock". Registered via
 * `res/xml/accessibility_service_config.xml` +
 * the `<service>` entry in this module's AndroidManifest.xml (merged into
 * the host app's manifest by the standard Android Gradle Plugin manifest
 * merger — see that manifest's top comment for why that merge happens with
 * zero extra plumbing on our part).
 *
 * The user must explicitly turn this service on for the app in Android
 * Settings > Accessibility (there is no programmatic "just enable it" API —
 * by design, only the user can grant an AccessibilityService; JS can at most
 * deep-link to the settings screen, which is a UI-layer concern, out of
 * scope here). Nothing in this file runs at all until that grant exists.
 *
 * ## What it watches
 * `accessibility_service_config.xml` subscribes only to
 * `TYPE_WINDOW_STATE_CHANGED`, which the platform fires when the
 * foreground window changes — i.e. once per app switch, not per touch/frame
 * — with `canRetrieveWindowContent="false"`: this service only ever needs
 * *which package* came to the foreground, never screen content, so it asks
 * for the narrowest, least privacy-sensitive event subscription that gives
 * us that.
 *
 * ## Version/OEM caveats (flagged per this task's instructions)
 * - `performGlobalAction(GLOBAL_ACTION_HOME)` has been stable since API 16
 *   and is the reliable half of the redirect — it does not depend on any
 *   extra permission or on background-activity-start rules.
 * - Launching [BlockedActivity] from here is the best-effort half. Starting
 *   an `Activity` from a non-Activity context landed background-activity-
 *   launch (BAL) restrictions on Android 10+ that tightened further on
 *   Android 12+; some OEM skins (notably many MIUI/ColorOS/EMUI builds)
 *   restrict this further still regardless of stock AOSP behavior.
 *   Accessibility services have historically been treated leniently here
 *   in practice (this is the same technique long-standing app-blocker apps
 *   on the Play Store rely on), but it is not a documented, version-stable
 *   guarantee — hence the `try/catch` below and the `GLOBAL_ACTION_HOME`
 *   call happening unconditionally first, so the user is never left
 *   sitting inside the blocked app even if the activity launch is silently
 *   suppressed on a given device.
 * - This service's process can be killed and restarted by the OS
 *   independently of the app's JS/React Native process (they normally share
 *   one process here, since no `android:process` override is set — see
 *   AndroidManifest.xml — but Android can still kill the whole process under
 *   memory pressure and only restart the service side on demand). Blocking
 *   state must therefore live outside either component's memory, which is
 *   exactly why [IbadahBlockingPrefs] is a durable, `SharedPreferences`-backed
 *   store rather than an in-memory field on either class.
 */
class IbadahBlockingAccessibilityService : AccessibilityService() {

  override fun onAccessibilityEvent(event: AccessibilityEvent?) {
    if (event == null || event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return

    val packageName = event.packageName?.toString() ?: return

    // Never redirect away from our own app — an app that blocked itself
    // would lock the user out of the very screen they'd use to unblock it.
    if (packageName == applicationContext.packageName) return

    if (!IbadahBlockingPrefs.isActive(applicationContext)) return
    if (packageName !in IbadahBlockingPrefs.blockedPackages(applicationContext)) return

    // Reliable half: always works, no extra permission, no BAL exposure.
    performGlobalAction(GLOBAL_ACTION_HOME)

    // Best-effort half: see the BAL caveat in the class doc comment above.
    try {
      val intent = Intent(this, BlockedActivity::class.java).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TASK)
      }
      startActivity(intent)
    } catch (e: Exception) {
      Log.w(TAG, "Could not present BlockedActivity for $packageName; GLOBAL_ACTION_HOME redirect still applied.", e)
    }

    BlockingEventBus.onBlockedAppOpened?.invoke()
  }

  override fun onInterrupt() {
    // Required abstract override. The platform calls this when it wants
    // this service to stop providing feedback outright (rare in practice);
    // there is no in-flight feedback of ours to cancel, so this is
    // intentionally a no-op.
  }

  override fun onUnbind(intent: Intent?): Boolean {
    // Fires when the OS unbinds this service — in practice, almost always
    // because the user turned the accessibility permission off from
    // Settings. This is the Android analogue of the iOS "user revoked
    // Screen Time authorization out from under the app" case the
    // `'stopped'` event exists for (see index.ts's `NativeBlockingEvent`
    // doc comment). Best-effort: if the whole process is being torn down
    // at the same time, there may be nothing left alive to deliver this to
    // — `BlockingEventBus.onStopped` being null in that case is expected,
    // not a bug.
    BlockingEventBus.onStopped?.invoke()
    return super.onUnbind(intent)
  }

  companion object {
    private const val TAG = "IbadahBlockingService"
  }
}
