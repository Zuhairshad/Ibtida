package expo.modules.ibadahnative

/**
 * In-process pub/sub bridging [IbadahBlockingAccessibilityService] (a
 * separate Android `Service` component, started/bound by the OS itself —
 * not something JS or [IbadahNativeModule] ever instantiates directly) to
 * whichever [IbadahNativeModule] instance is currently alive, so a redirect
 * decided on the accessibility-service thread can still reach
 * `Module.sendEvent` and surface as JS's `onBlockingEvent`.
 *
 * Both components normally run in the same app process (an
 * `AccessibilityService` only runs in a separate process when its manifest
 * entry opts into `android:process`, which this module's manifest does not
 * do — see AndroidManifest.xml), so a plain static/object-level callback is
 * enough; no cross-process IPC (AIDL/Messenger) is needed.
 *
 * The registered callback is intentionally allowed to be `null`: the
 * accessibility service can be alive (and correctly enforcing the block
 * list) with no JS runtime around to listen at all — e.g. the app was
 * swiped away from recents while a lock was active. Firing into a `null`
 * listener is a normal, expected no-op, not an error.
 */
internal object BlockingEventBus {
  /** Fired every time the service redirects away from a blocked app. Carries
   * no payload — the JS-facing event shape (`{ type: 'blocked-app-opened' }`,
   * see index.ts's `NativeBlockingEvent`) only needs to say *that* it
   * happened. */
  @Volatile
  var onBlockedAppOpened: (() -> Unit)? = null

  /** Fired when the *native* side stops enforcing on its own — concretely,
   * the accessibility service being unbound because the user turned its
   * permission off from Android Settings while a lock was active (see
   * `IbadahBlockingAccessibilityService.onUnbind`). A JS-initiated
   * `stopBlocking()` does NOT go through this bus — the caller already
   * knows it stopped because it awaited that call. */
  @Volatile
  var onStopped: (() -> Unit)? = null
}
