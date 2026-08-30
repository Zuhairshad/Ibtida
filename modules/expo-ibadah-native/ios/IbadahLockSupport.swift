import Foundation
import ManagedSettings
import FamilyControls
import ExpoModulesCore

// -----------------------------------------------------------------------------
// Opaque app-id <-> ApplicationToken coding
// -----------------------------------------------------------------------------

/// Encodes/decodes the opaque `id` strings this module hands to JS for a
/// blocked app (`BlockedAppRef.id` in `modules/expo-ibadah-native/index.ts`).
///
/// Apple's Family Controls framework deliberately never exposes a bundle id
/// or app name to third-party code for a user-picked app — `ApplicationToken`
/// is an opaque, privacy-preserving value that only Apple's own system UI
/// (e.g. the `Label(_:)` SwiftUI view, or the Shield UI itself) can turn back
/// into a real icon/name. `ApplicationToken` does conform to `Codable`
/// (Apple's docs list it as `Codable, Hashable, Equatable`), so JSON + base64
/// of the token itself is the only thing we *can* hand back to JS, and the
/// only thing `startBlocking(appIds:)` needs to reconstruct it later.
enum ApplicationTokenCoding {
  static func encode(_ token: ApplicationToken) -> String? {
    guard let data = try? JSONEncoder().encode(token) else {
      return nil
    }
    return data.base64EncodedString()
  }

  static func decode(_ base64: String) throws -> ApplicationToken {
    guard let data = Data(base64Encoded: base64) else {
      throw InvalidApplicationTokenException(base64)
    }
    do {
      return try JSONDecoder().decode(ApplicationToken.self, from: data)
    } catch {
      throw InvalidApplicationTokenException(base64)
    }
  }
}

// -----------------------------------------------------------------------------
// The shield store
// -----------------------------------------------------------------------------

/// The single named `ManagedSettingsStore` this module uses to shield apps.
/// Using a name (rather than the default, unnamed store) keeps this feature's
/// settings isolated from any other `ManagedSettingsStore` this app — or a
/// future feature — might create, and gives the settings a stable identity
/// across process relaunches.
///
/// Important: `ManagedSettingsStore` settings are persisted by the OS itself,
/// keyed by this name, independently of this process's lifetime. Once
/// `startBlocking` sets `shield.applications`, the shield stays in effect
/// even if the app is backgrounded or killed — no extension or background
/// process needs to be running for the *shield itself* to keep working.
/// (A `DeviceActivityMonitor` extension — scaffolded separately under
/// `ios/DeviceActivityMonitorExtension/` — is what you'd add on top of this
/// for *schedule-driven* start/stop, e.g. "shield only during prayer
/// windows"; it is not required for the simple manual start/stop this module
/// implements today.)
enum IbadahManagedSettings {
  static let storeName = ManagedSettingsStore.Name("ibadahLock")

  static var store: ManagedSettingsStore {
    ManagedSettingsStore(named: storeName)
  }
}

// -----------------------------------------------------------------------------
// Exceptions
// -----------------------------------------------------------------------------

/// Thrown when `pickAppsToBlock()` has no view controller to present the
/// picker sheet from (e.g. called before the app has a key window).
final class NoPresentingViewControllerException: GenericException<String> {
  override var reason: String {
    "\(param)(): no view controller is currently available to present the Family Activity picker from."
  }
}

/// Thrown when `AuthorizationCenter.shared.requestAuthorization(for:)`
/// rejects or throws — e.g. the user declined the Screen Time / Family
/// Controls permission prompt, or this build doesn't hold the
/// `com.apple.developer.family-controls` entitlement at all (see
/// `docs/ios-family-controls-entitlement.md`).
final class FamilyControlsAuthorizationException: GenericException<String> {
  override var reason: String {
    "Family Controls authorization was not granted: \(param)"
  }
}

/// Thrown by `startBlocking` when one of the `appIds` it was given isn't a
/// valid base64-encoded `ApplicationToken` — most likely because it didn't
/// actually come from this module's own `pickAppsToBlock()` result.
final class InvalidApplicationTokenException: GenericException<String> {
  override var reason: String {
    "\"\(param)\" is not a valid app id returned by pickAppsToBlock()."
  }
}
