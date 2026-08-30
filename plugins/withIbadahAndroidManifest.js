// Small local config plugin for the one Android-manifest tweak that lives on
// the *host app's own* MainActivity, rather than inside
// modules/expo-ibadah-native's own AndroidManifest.xml.
//
// Everything else Ibadah Lock / the wake-verified alarm need on Android
// (the AccessibilityService + its <queries> exemption, the wake-alarm
// receivers/services/activity, SCHEDULE_EXACT_ALARM and friends) is already
// declared in modules/expo-ibadah-native/android/src/main/AndroidManifest.xml.
// That is a normal Android-library manifest belonging to a local Expo Module,
// which Expo's autolinking adds as a `settings.gradle` project dependency of
// the app — from there, folding a library's manifest into the host app's
// final manifest is standard Android Gradle Plugin manifest-merger behavior,
// not something that needs a config plugin of its own (confirmed against
// this project's installed `expo-modules-autolinking` source; see the
// Android app-blocking agent's report). So this file intentionally does
// NOT re-declare any of those permissions/components — duplicating them
// here would just be redundant with what the module's own manifest already
// contributes on every `expo prebuild`.
//
// What *is* needed here: the wake-alarm agent's real-device recommendation
// that the host app's own MainActivity carry `android:showWhenLocked="true"`
// and `android:turnScreenOn="true"` too, so a tapped full-screen wake-alarm
// intent can (in the future) route straight into the RN app's own Activity
// instead of always bouncing through the module's bridge
// `WakeAlarmFullScreenActivity` first. This is optional/defense-in-depth —
// the bridge activity already works standalone — but costs nothing to carry
// on every prebuild via a config plugin, since `app.json` has no top-level
// field for arbitrary <activity> attributes on the generated MainActivity.
//
// Docs: https://docs.expo.dev/versions/v57.0.0/config-plugins/plugins-and-mods/
// and https://docs.expo.dev/versions/v57.0.0/config-plugins/mods/ for
// `withAndroidManifest`; `AndroidConfig.Manifest.getMainActivityOrThrow` is
// the same helper Expo's own first-party plugins use to locate MainActivity.
const { withAndroidManifest, AndroidConfig } = require('expo/config-plugins');

/** @param {import('expo/config-plugins').ExportedConfigWithProps} config */
function withIbadahAndroidManifest(config) {
  return withAndroidManifest(config, (config) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(config.modResults);
    mainActivity.$['android:showWhenLocked'] = 'true';
    mainActivity.$['android:turnScreenOn'] = 'true';
    return config;
  });
}

module.exports = withIbadahAndroidManifest;
