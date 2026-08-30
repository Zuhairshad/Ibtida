package expo.modules.ibadahnative

import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * Native bridge behind `modules/expo-ibadah-native/index.ts`.
 *
 * ## App blocking ("Ibadah Lock") — real Android implementation
 * Enforcement is an `AccessibilityService`
 * ([IbadahBlockingAccessibilityService]) that watches
 * `TYPE_WINDOW_STATE_CHANGED` events (fired once per foreground-app switch)
 * and, when the newly-foregrounded package is in the persisted blocked set,
 * redirects home (`GLOBAL_ACTION_HOME`) and best-effort surfaces
 * [BlockedActivity]. The blocked-package set itself is persisted in
 * `SharedPreferences` via [IbadahBlockingPrefs] — this `Module` and that
 * `Service` are separate Android components with independent lifecycles
 * (see that service's doc comment), so a durable, cross-component store is
 * the only reliable hand-off between "JS asked to start/stop blocking" and
 * "the always-on watcher enforces it". See
 * `res/xml/accessibility_service_config.xml` and this module's
 * `AndroidManifest.xml` for how the service itself is registered — an
 * ordinary Android-library manifest merge (`com.android.library`, applied
 * in this module's `build.gradle`), which the standard Android Gradle
 * Plugin manifest merger folds into the host app's final manifest at build
 * time. This is a stock AGP mechanism that applies to any Android library
 * subproject; Expo's autolinking is only responsible for adding this module
 * as a `settings.gradle` project dependency of the app so AGP ever sees its
 * manifest in the first place — autolinking does not itself do any
 * manifest merging.
 *
 * Enabling the accessibility service is a user action performed in Android
 * Settings; there is no API to grant it programmatically. `stopBlocking()`
 * does not (and cannot) revoke that OS-level permission — it clears the
 * persisted blocked set instead, which is what actually turns enforcement
 * off (see [IbadahBlockingPrefs.stop]'s doc comment for why that is
 * "reliable and immediate").
 *
 * ## Wake alarm
 * Real implementation — see [WakeAlarmController] (the facade this
 * `Module`'s wake-alarm functions call into) and its own referenced classes
 * ([WakeAlarmScheduler], [WakeAlarmReceiver], [WakeAlarmRingingService],
 * [WakeAlarmFullScreenActivity], [WakeAlarmBootReceiver], [WakeAlarmPrefs])
 * for the real `AlarmManager` + foreground-service + full-screen-intent
 * mechanics and every doc comment on the platform-API/permission decisions
 * behind them. This `Module` only ever calls `WakeAlarmController` — kept
 * deliberately thin here since this file is shared with a sibling
 * app-blocking agent in the same batch.
 *
 * Two additions beyond this module's frozen `index.ts` base contract, both
 * needed to make the wake alarm actually usable end to end (documented here
 * and in this module's report for the JS-UI agent):
 *  - `stopWakeAlarmRinging(id)`: the only thing that stops a ringing alarm —
 *    call after a successful `WakeScanScreen` verification.
 *  - `openExactAlarmSettings()`: on Android 12+ `scheduleWakeAlarm` throws
 *    `ERR_IBADAH_NATIVE_EXACT_ALARM_PERMISSION` until the user has granted
 *    `SCHEDULE_EXACT_ALARM`; this opens the system screen to grant it.
 *
 * ## Play Store policy note (flagged, not silently buried)
 * An `AccessibilityService` used to watch foreground-app changes for
 * app-blocking — rather than for its namesake purpose of assisting users
 * with disabilities — is exactly the kind of use Google Play's
 * Accessibility API policy singles out for extra review scrutiny. Play
 * Store review can and does reject or remove apps over this if the
 * store listing doesn't clearly disclose the accessibility service's real
 * purpose. This is a policy/business concern for the app owner to handle
 * in the Play Console listing, not something fixable in code — flagging it
 * here rather than leaving it implicit.
 */
class IbadahNativeModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("IbadahNative")

    Events("onBlockingEvent", "onWakeAlarmEvent")

    // Bridges IbadahBlockingAccessibilityService (a separate Service
    // component the OS drives, not this Module) back to JS. See
    // BlockingEventBus's doc comment for why a plain in-process callback is
    // sufficient here rather than any cross-process IPC.
    OnCreate {
      BlockingEventBus.onBlockedAppOpened = {
        sendEvent("onBlockingEvent", mapOf("type" to "blocked-app-opened"))
      }
      BlockingEventBus.onStopped = {
        sendEvent("onBlockingEvent", mapOf("type" to "stopped"))
      }
      WakeAlarmEventBus.onFired = { id ->
        sendEvent("onWakeAlarmEvent", mapOf("type" to "fired", "id" to id))
      }
      WakeAlarmEventBus.onDismissed = { id ->
        sendEvent("onWakeAlarmEvent", mapOf("type" to "dismissed", "id" to id))
      }
    }

    OnDestroy {
      // Avoid leaking a reference to a Module instance that is going away —
      // the next Module instance (if any) re-registers its own callbacks in
      // its own OnCreate.
      BlockingEventBus.onBlockedAppOpened = null
      BlockingEventBus.onStopped = null
      WakeAlarmEventBus.onFired = null
      WakeAlarmEventBus.onDismissed = null
    }

    Function("isAppBlockingSupported") {
      // AccessibilityService + PackageManager are available on every
      // Android version this app targets — no capability gate needed.
      true
    }

    Function("isAlarmSupported") {
      WakeAlarmController.isSupported()
    }

    AsyncFunction("pickAppsToBlock") {
      queryLaunchableNonSystemApps(requireContext())
    }

    AsyncFunction("startBlocking") { appIds: List<String> ->
      IbadahBlockingPrefs.start(requireContext(), appIds.toSet())
    }

    AsyncFunction("stopBlocking") {
      IbadahBlockingPrefs.stop(requireContext())
    }

    AsyncFunction("scheduleWakeAlarm") { id: String, whenEpochMs: Double, opts: Map<String, Any?>? ->
      val soundName = opts?.get("soundName") as? String
      WakeAlarmController.schedule(requireContext(), id, whenEpochMs.toLong(), soundName)
    }

    AsyncFunction("cancelWakeAlarm") { id: String ->
      WakeAlarmController.cancel(requireContext(), id)
    }

    // --- Additions beyond index.ts's base contract (see this Module's
    // class doc comment and this module's report) ---

    AsyncFunction("stopWakeAlarmRinging") { id: String ->
      WakeAlarmController.stopRinging(requireContext(), id)
    }

    AsyncFunction("openExactAlarmSettings") {
      WakeAlarmController.openExactAlarmSettings(requireContext())
    }
  }

  private fun requireContext(): Context =
    appContext.reactContext?.applicationContext
      ?: throw CodedException(
        "ERR_IBADAH_NATIVE_NO_CONTEXT",
        "No Android context is currently available to expo-ibadah-native.",
        null
      )

  /**
   * Lists launchable, non-system apps via `PackageManager#queryIntentActivities`
   * against the `ACTION_MAIN`/`CATEGORY_LAUNCHER` intent — the same query
   * Android launchers themselves use to build their app drawer. Requires the
   * `<queries><intent>...` package-visibility exemption declared in this
   * module's `AndroidManifest.xml` to see other apps' launcher activities at
   * all on API 30+ (see that manifest's comment).
   *
   * "Non-system" is approximated as: not flagged `FLAG_SYSTEM`, OR flagged
   * both `FLAG_SYSTEM` and `FLAG_UPDATED_SYSTEM_APP`. Rationale: pure
   * `FLAG_SYSTEM` apps are ones that shipped as part of the device image and
   * were never user-installed/updated (bootloader UI, carrier bloat the
   * user can't remove, OEM system utilities) — not realistic
   * self-distraction targets and often not safe to redirect away from
   * (e.g. a Settings-like system app). `FLAG_UPDATED_SYSTEM_APP` covers the
   * common case of a system-image app that has since been updated through
   * the Play Store (e.g. Chrome, Gmail, YouTube pre-installed on many OEM
   * images) — those are exactly the kind of everyday, updatable apps a user
   * would plausibly want to block, so they are kept in. A full
   * launcher-app query (rather than a curated allowlist) is used because a
   * hardcoded "common social apps" list would miss the long tail of
   * region-specific and less-common apps users actually want to block, and
   * because filtering by these two well-documented `ApplicationInfo` flags
   * is a narrow, precedented technique (the same one Android's own device
   * "storage"/app-management UIs use) rather than an invasive full
   * `QUERY_ALL_PACKAGES`-style enumeration.
   */
  private fun queryLaunchableNonSystemApps(context: Context): List<Map<String, Any?>> {
    val packageManager = context.packageManager
    val launcherIntent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER)

    @Suppress("DEPRECATION") // The ResolveInfoFlags overload is API 33+ only;
    // this simpler overload is still fully functional (not removed) and
    // covers this app's full supported API range with one code path.
    val resolveInfos = packageManager.queryIntentActivities(launcherIntent, 0)

    val ownPackageName = context.packageName

    return resolveInfos
      .asSequence()
      .distinctBy { it.activityInfo.packageName }
      .filter { resolveInfo ->
        val appInfo = resolveInfo.activityInfo.applicationInfo
        val packageName = resolveInfo.activityInfo.packageName
        val isSystem = (appInfo.flags and ApplicationInfo.FLAG_SYSTEM) != 0
        val isUpdatedSystem = (appInfo.flags and ApplicationInfo.FLAG_UPDATED_SYSTEM_APP) != 0
        packageName != ownPackageName && (!isSystem || isUpdatedSystem)
      }
      .map { resolveInfo ->
        val appInfo = resolveInfo.activityInfo.applicationInfo
        val label = try {
          packageManager.getApplicationLabel(appInfo)?.toString()
        } catch (e: Exception) {
          null
        }
        resolveInfo.activityInfo.packageName to label
      }
      .sortedBy { (packageName, label) -> label?.lowercase() ?: packageName }
      .map { (packageName, label) -> mapOf("id" to packageName, "label" to label) }
      .toList()
  }
}
