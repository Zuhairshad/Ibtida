import DeviceActivity

// -----------------------------------------------------------------------------
// SCAFFOLDING ONLY — see the doc comment block below and
// docs/ios-family-controls-entitlement.md for what a human still has to do
// in Xcode before this file is part of a working build. This file cannot be
// wired up by a config plugin or any script running in this repo's sandbox
// (there is no Xcode/Android Studio here) — it is source-level-correct
// scaffolding for the human to attach to a real extension target.
// -----------------------------------------------------------------------------

/// A `DeviceActivityMonitor` subclass is how Apple's Screen Time APIs let an
/// app react to *scheduled* device-activity events from a separate,
/// system-launched extension process — e.g. "this monitored interval
/// started/ended" or "a configured usage-threshold event fired" — even while
/// the host app isn't running. `startBlocking`/`stopBlocking` in
/// `IbadahNativeModule.swift` do NOT need this extension to work today: a
/// `ManagedSettingsStore`'s `shield.applications` is enforced by the system
/// as soon as it's set, independent of any extension or of the host app
/// staying alive. This extension only becomes necessary once Ibadah Lock
/// wants *schedule-driven* blocking (e.g. "shield these apps automatically
/// during each prayer window" instead of an explicit `startBlocking` call) —
/// that scheduling call (`DeviceActivityCenter().startMonitoring(_:during:)`
/// from the host app, defining a `DeviceActivitySchedule`) is not built here
/// either; only the extension side that would receive its callbacks is
/// scaffolded.
///
/// Every override below is a no-op scaffold: they compile and are ready to
/// have real behavior added (most usefully, setting/clearing
/// `ManagedSettingsStore(named: IbadahManagedSettings.storeName).shield.applications`
/// from `intervalDidStart`/`intervalDidEnd` once a schedule exists to drive
/// them — note `IbadahManagedSettings` itself lives in the *main app
/// target's* `IbadahLockSupport.swift`, not this extension target, so you'd
/// either duplicate that tiny enum here or move it to a shared file both
/// targets compile).
///
/// Relaying an event from here back into the running host app (for
/// `onBlockingEvent` in index.ts) needs an App Group–shared mechanism —
/// e.g. `UserDefaults(suiteName: "group.<your-app-group>")` written here and
/// read/observed by the host app's `IbadahNativeModule`, or a Darwin
/// notification (`CFNotificationCenterGetDarwinNotifyCenter`) posted here and
/// observed there — extensions and their host app run in separate processes
/// and cannot call each other's Swift methods directly. That wiring is a
/// deliberate follow-up, not part of this scaffold.
class IbadahDeviceActivityMonitor: DeviceActivityMonitor {
  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)
    // TODO(follow-up): apply the shield for `activity`'s configured app
    // tokens here once a `DeviceActivitySchedule` exists to drive this.
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    // TODO(follow-up): clear the shield here.
  }

  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    // TODO(follow-up): react to a configured usage-threshold event, if this
    // feature ever adds one (e.g. "N minutes of blocked-app use attempted").
  }

  override func intervalWillStartWarning(for activity: DeviceActivityName) {
    super.intervalWillStartWarning(for: activity)
  }

  override func intervalWillEndWarning(for activity: DeviceActivityName) {
    super.intervalWillEndWarning(for: activity)
  }

  override func eventWillReachThresholdWarning(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventWillReachThresholdWarning(event, activity: activity)
  }
}
