import ExpoModulesCore
import FamilyControls
import ManagedSettings

/// Native bridge behind `modules/expo-ibadah-native/index.ts`.
///
/// App-blocking ("Ibadah Lock") side — implemented for real in this pass
/// using Apple's Family Controls / Screen Time APIs:
///  - `isAppBlockingSupported()`: reflects `AuthorizationCenter`'s actual,
///    live authorization status (not just "does the framework exist").
///  - `pickAppsToBlock()`: requests Family Controls authorization if needed,
///    then presents Apple's `FamilyActivityPicker` (SwiftUI, bridged via
///    `IbadahAppPickerPresenter` in FamilyActivityPickerPresenter.swift) and
///    resolves with the opaque, base64-encoded `ApplicationToken`s the user
///    picked (see IbadahLockSupport.swift's `ApplicationTokenCoding` doc
///    comment for why these can never be real bundle ids or names).
///  - `startBlocking(appIds:)` / `stopBlocking()`: decode those tokens back
///    and apply/clear them on a named `ManagedSettingsStore`'s
///    `shield.applications`.
///  - None of this does anything on a device/build that doesn't hold the
///    `com.apple.developer.family-controls` entitlement — Apple's APIs
///    themselves stay callable, but `AuthorizationCenter.requestAuthorization`
///    will simply fail. See `docs/ios-family-controls-entitlement.md`.
///
/// What is intentionally NOT wired yet (documented here, not built in this
/// pass — the frozen `index.ts` contract still declares these events/
/// functions for the next phase to fill in):
///  - `onBlockingEvent` is only ever emitted with `{ type: 'stopped' }`, and
///    only when `stopBlocking()` is explicitly called from JS. Detecting an
///    actual "blocked app opened" attempt (`{ type: 'blocked-app-opened' }`)
///    happens inside the `DeviceActivityMonitorExtension` process (see that
///    folder), which cannot call `sendEvent` on this module directly — it
///    runs out-of-process. Relaying that back into the host app needs an App
///    Group–shared container (Darwin notifications or a shared
///    `UserDefaults(suiteName:)`) that this host module would then observe;
///    that plumbing is a follow-up, not part of this scaffold.
///  - Likewise, detecting the user revoking Family Controls authorization
///    "out from under the app" (also documented as a `'stopped'` case in
///    index.ts) would need observing `AuthorizationCenter`'s published
///    status from within this module — left as a follow-up rather than
///    guessed at here.
///
/// Wake-alarm side (`isAlarmSupported`, `scheduleWakeAlarm`,
/// `cancelWakeAlarm`) is OUT OF SCOPE for this pass and deliberately left as
/// the honest "not implemented" stub — that is a different agent's work per
/// the shared-foundation report.
///
/// Every event this module can emit to JS is declared up front via `Events`
/// so `NativeModule.addListener` (surfaced to JS through this project's
/// `addBlockingEventListener` / `addWakeAlarmEventListener` in index.ts) has
/// somewhere real to attach.
public class IbadahNativeModule: Module {
  /// Retains the in-flight `FamilyActivityPicker` presenter for the duration
  /// of a `pickAppsToBlock()` call so it isn't deallocated mid-sheet. Typed
  /// `AnyObject?` (rather than `IbadahAppPickerPresenter?`) so this stored
  /// property itself doesn't need an `@available(iOS 16.0, *)` annotation —
  /// only the value assigned to it, inside the already-guarded call site,
  /// does.
  private var pendingAppPicker: AnyObject?

  public func definition() -> ModuleDefinition {
    Name("IbadahNative")

    Events("onBlockingEvent", "onWakeAlarmEvent")

    Function("isAppBlockingSupported") { () -> Bool in
      guard #available(iOS 16.0, *) else {
        return false
      }
      // Reflects whether the user has actually granted Family Controls
      // authorization on this device right now — never prompts, and never
      // just checks "is the framework linked". `pickAppsToBlock()` is the
      // one that triggers the authorization prompt if needed.
      return AuthorizationCenter.shared.authorizationStatus == .approved
    }

    Function("isAlarmSupported") { () -> Bool in
      // Untouched: wake-alarm native work is out of scope for this pass.
      false
    }

    AsyncFunction("pickAppsToBlock") { (promise: Promise) in
      guard #available(iOS 16.0, *) else {
        promise.reject(NotImplementedException("pickAppsToBlock"))
        return
      }
      Task { [weak self] in
        guard let self else { return }

        do {
          // `.individual` is the Family Controls authorization kind meant
          // for an app restricting the *current* user's own device (added
          // in iOS 16) — as opposed to `.child`, which is for parental
          // controls over a Family Sharing child account. Ibadah Lock is
          // self-imposed, so `.individual` is the correct case here. This
          // is a no-op (resolves immediately) if already `.approved`.
          if AuthorizationCenter.shared.authorizationStatus != .approved {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
          }
        } catch {
          promise.reject(FamilyControlsAuthorizationException(error.localizedDescription))
          return
        }

        await MainActor.run {
          guard let viewController = self.appContext?.utilities?.currentViewController() else {
            promise.reject(NoPresentingViewControllerException("pickAppsToBlock"))
            return
          }

          let pickerPresenter = IbadahAppPickerPresenter()
          self.pendingAppPicker = pickerPresenter

          pickerPresenter.present(
            on: viewController,
            onDone: { [weak self] selection in
              self?.pendingAppPicker = nil
              // `label` is always nil — see ApplicationTokenCoding's doc
              // comment on why Apple never hands back a real name here.
              let refs: [[String: Any?]] = selection.applicationTokens.compactMap { token in
                guard let id = ApplicationTokenCoding.encode(token) else {
                  return nil
                }
                return ["id": id, "label": nil]
              }
              promise.resolve(refs)
            },
            onCancel: { [weak self] in
              self?.pendingAppPicker = nil
              // A user-cancelled picker resolves with an empty selection
              // rather than rejecting — mirrors "picked nothing", not an
              // error condition callers need to catch specially.
              promise.resolve([[String: Any?]]())
            }
          )
        }
      }
    }

    AsyncFunction("startBlocking") { (appIds: [String]) throws -> Void in
      guard #available(iOS 16.0, *) else {
        throw NotImplementedException("startBlocking")
      }
      let tokens = try Set(appIds.map { try ApplicationTokenCoding.decode($0) })
      // Setting `nil` (rather than an empty `Set`) clears the shield outright
      // when called with an empty list, matching `stopBlocking()`'s effect.
      IbadahManagedSettings.store.shield.applications = tokens.isEmpty ? nil : tokens
    }

    AsyncFunction("stopBlocking") { [weak self] () throws -> Void in
      guard #available(iOS 16.0, *) else {
        throw NotImplementedException("stopBlocking")
      }
      let store = IbadahManagedSettings.store
      store.shield.applications = nil
      store.shield.applicationCategories = nil
      self?.sendEvent("onBlockingEvent", ["type": "stopped"])
    }

    AsyncFunction("scheduleWakeAlarm") { (_ id: String, _ whenEpochMs: Double, _ opts: [String: Any?]?) -> Void in
      throw NotImplementedException("scheduleWakeAlarm")
    }

    AsyncFunction("cancelWakeAlarm") { (_ id: String) -> Void in
      throw NotImplementedException("cancelWakeAlarm")
    }
  }
}

/// Thrown by every not-yet-implemented function. `param` is the function
/// name, so every call site gets a distinct, readable message without
/// repeating the reason string at each throw site.
final class NotImplementedException: GenericException<String> {
  override var reason: String {
    "\(param)() is not implemented on iOS yet."
  }
}
