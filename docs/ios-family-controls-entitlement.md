# iOS Family Controls entitlement — what you need to do

Ibadah Lock's iOS app-blocking is built on Apple's **Family Controls** /
**Screen Time** APIs (`FamilyControls`, `ManagedSettings`, `DeviceActivity`).
These frameworks link and compile fine in any build, but at runtime every
call that actually does something (`AuthorizationCenter.requestAuthorization`,
the `FamilyActivityPicker`, `ManagedSettingsStore`) requires your app to hold
the **Family Controls entitlement** — `com.apple.developer.family-controls`.

This entitlement is **not self-service**. You cannot add it in Xcode's
"Signing & Capabilities" tab the way you can for most capabilities; Apple
requires every app that wants it to be individually approved. Nothing in
this repo, and no agent, can request or grant this on your behalf — it has
to come from you, as the Apple Developer account holder.

## 1. Request the entitlement from Apple

1. Sign in to [developer.apple.com](https://developer.apple.com) with the
   account this app is (or will be) distributed under.
2. Go to **Account → Additional Capabilities** (Apple's request form for
   capabilities that aren't self-service — currently linked from the
   Certificates, Identifiers & Profiles area; Apple has moved this page
   before, so search "Family Controls" from the main Account page if the
   path has changed again).
3. Find **Family Controls** in the list of requestable additional
   capabilities and submit a request. Apple will ask for:
   - Your app's bundle identifier (`expo.ios.bundleIdentifier` — not yet set
     in this repo's `app.json`; you'll need to add one before archiving a
     real build).
   - A description of your use case. Ibadah Lock's case — an app that lets a
     user restrict distracting apps *on their own device*, tied to prayer
     times — is the "individual"/self-restriction use case Apple added
     Family Controls support for in iOS 16 (as opposed to the original
     iOS 15 parental-control-only case). Say so plainly; mention that the
     app calls `AuthorizationCenter.requestAuthorization(for: .individual)`
     and never targets a child/Family Sharing account.
4. Submit and wait. **Apple reviews every request manually.** Expect:
   - This is not instant — historically anywhere from a few days to a few
     weeks.
   - Approval is **not guaranteed**. Apple has rejected requests for apps
     whose use case reads as a workaround for a different feature (e.g.
     content blocking unrelated to screen-time/self-control), or that don't
     clearly need the *specific* capabilities Family Controls grants.
     Screen-time/self-control and parental-control apps are the well-established, typically-approved category this app falls into.
   - You'll be notified by email; approved capabilities then become
     available to add to an App ID in Certificates, Identifiers & Profiles.

## 2. Once approved: add it to your App ID and entitlements

1. In **Certificates, Identifiers & Profiles → Identifiers**, select this
   app's App ID (create one first if `app.json`'s `expo.ios.bundleIdentifier`
   isn't registered yet) and enable the now-available **Family Controls**
   capability.
2. If you add the `DeviceActivityMonitorExtension` scaffolded in
   `modules/expo-ibadah-native/ios/DeviceActivityMonitorExtension/` as a real
   Xcode extension target (see step 3 below), register **its** bundle
   identifier (e.g. `<your-app-bundle-id>.DeviceActivityMonitorExtension`)
   as its own App ID too, and enable Family Controls on it as well — an
   extension that reacts to Screen Time events needs the entitlement in its
   own right, not just inherited from the host app.
3. In Xcode, for each target that needs it (the main app target, and the
   extension target if you add one): **Signing & Capabilities → + Capability
   → Family Controls**. Xcode will add
   `com.apple.developer.family-controls = true` to that target's
   `.entitlements` file automatically once the App ID has the capability
   enabled on the portal.
4. `expo prebuild` regenerates the iOS project from scratch, which does not
   currently know about a custom entitlement like this — either add a config
   plugin (`withEntitlementsPlist`, from `@expo/config-plugins`, is the
   documented way to inject entitlement key/value pairs into
   `app.json`'s `ios.entitlements` post-prebuild) or expect to re-add this
   capability in Xcode after every prebuild until such a plugin exists. That
   plugin is not written as part of this pass — this app-blocking scaffold
   intentionally does not touch `app.json` or any config-plugin file (see
   this pass's task scope).

## 3. Wiring the `DeviceActivityMonitorExtension` folder into a real target

`modules/expo-ibadah-native/ios/DeviceActivityMonitorExtension/` contains a
`DeviceActivityMonitor` subclass and an `Info.plist`, written to be correct
Swift/plist content — but a brand-new Xcode **target** (a "Device Activity
Monitor Extension" target, from Xcode's extension template picker) cannot be
created by a config plugin or by any script in this repo's sandbox (there's
no Xcode here to script against, and `@expo/config-plugins`' documented mod
APIs cover editing existing files/settings, not creating new build targets).
You'll need to, by hand in Xcode:

1. **File → New → Target… → Device Activity Monitor Extension.**
2. When Xcode scaffolds its own template files, replace its generated
   `<ExtensionName>.swift` with (or copy the contents of)
   `modules/expo-ibadah-native/ios/DeviceActivityMonitorExtension/IbadahDeviceActivityMonitor.swift`,
   and replace its generated `Info.plist` with (or diff against) the one in
   that same folder — Xcode's own template already sets the right
   `NSExtensionPointIdentifier`/principal-class keys, so cross-check rather
   than blindly overwrite if Xcode's generated file looks different from
   this one.
3. Add the **Family Controls** capability to this new target too (step 2.3
   above).
4. Confirm the new target is listed under the main app target's **General →
   Frameworks, Libraries, and Embedded Content** so it's embedded in the
   host app bundle (Xcode's extension template usually wires this
   automatically, but verify after any manual file swaps).
5. This extension is only useful once something actually calls
   `DeviceActivityCenter().startMonitoring(_:during:events:)` to register a
   schedule — that call isn't implemented anywhere in this codebase yet (see
   the doc comment atop `IbadahDeviceActivityMonitor.swift`); today's
   `startBlocking`/`stopBlocking` work without this extension at all, since
   `ManagedSettingsStore.shield.applications` is enforced by the system the
   moment it's set, extension or not.

## What already works without any of the above

Everything in `modules/expo-ibadah-native/ios/IbadahNativeModule.swift`,
`IbadahLockSupport.swift`, and `FamilyActivityPickerPresenter.swift` is
real, complete Swift against the documented `FamilyControls`/`ManagedSettings`
APIs, and will start working the moment the app is built with the
entitlement in place (steps 1–2 above) — no extension needed for basic
manual "block this list now" / "unblock now" behavior. Until then,
`isAppBlockingSupported()` correctly reports `false` and `pickAppsToBlock()`
will fail authorization with a clear, catchable error rather than silently
doing nothing.
