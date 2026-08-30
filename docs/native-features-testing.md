# Native features — testing & handoff guide

This covers everything built for three features: the real prayer-time
engine, "Ibadah Lock" app-blocking (Android + iOS), and the wake-verified
prayer alarm (Android native + a cross-platform notification fallback) —
plus the Supabase migrations backing all three. It was written by an agent
working in a Linux sandbox with **no Android SDK, no emulator, and no
Xcode** — none of the native Kotlin/Swift code below has been compiled or
run by anyone. Everything is written carefully against documented,
real platform APIs, but it is untested-by-any-agent and needs your own
device/emulator pass before you trust it.

## Final typecheck/lint status

Both pass clean, no changes needed beyond what's described in "What was
fixed this pass" below:

```
npm run typecheck   # tsc --noEmit — exit 0, no errors
npm run lint         # eslint . --ext .ts,.tsx — exit 0, no errors/warnings
```

## What was fixed this pass

1. **`src/services/wakeAlarm.ts` — `logWakeVerification` RLS bug (fixed by
   a prior pass, verified still correct).** `wake_verifications` is
   append-only (no `update` RLS policy). The upsert now passes
   `ignoreDuplicates: true`, compiling to `ON CONFLICT DO NOTHING` instead
   of `DO UPDATE`, so a second same-day QR scan no-ops instead of getting
   rejected by RLS.
2. **`modules/expo-ibadah-native/index.ts` was missing two functions the
   real Android native module (`IbadahNativeModule.kt`) already implements:
   `stopWakeAlarmRinging(id)` and `openExactAlarmSettings()`.** Without a JS
   declaration, nothing could ever call the one function that stops a
   ringing native alarm. Fixed by:
   - Adding both to `index.ts`'s native contract and exporting JS wrappers,
     gated to `Platform.OS === 'android'` (iOS's Swift module implements
     neither — its wake alarm is a notification, not a ringing service — so
     the wrapper resolves as a safe no-op on iOS/web instead of throwing a
     raw "native function not found" error).
   - Wiring `stopWakeAlarmRinging` into `src/screens/shared/
     WakeAlarmScanScreen.tsx`, called (best-effort, errors swallowed) right
     after a verified scan is logged.
   - This is currently a safe no-op in production: nothing schedules the
     native Android alarm yet (see "Known gap, deliberately not closed"
     below), so there is never anything ringing for it to stop today. It
     becomes load-bearing the moment Android's real `AlarmManager` path is
     wired into scheduling.
   - `openExactAlarmSettings()` is now exposed in the JS contract (matching
     the real native surface) but has no UI call site yet — see the same
     "known gap" section for why.

## Known gap, deliberately not closed this pass

**Android's real native wake alarm (`AlarmManager` + full-screen ringing
service) is fully built and wired end-to-end at the native layer, but the
app does not schedule it.** `src/services/wakeAlarmScheduling.ts` — the
code path actually wired into the app (`App.tsx` calls
`syncAllWakeAlarmSchedules` on launch/foreground) — schedules a rolling
window of `expo-notifications` one-shot notifications on **both**
platforms, and `WakeAlarmSettingsScreen.tsx`'s own copy tells the user
exactly that: *"This rings once, as a real alert with sound — not a
looping alarm. Neither iOS nor Android lets an ordinary app take over the
phone like a dedicated alarm clock."*

Switching Android over to the real native alarm (`scheduleWakeAlarm`/
`cancelWakeAlarm` in `modules/expo-ibadah-native`) is a genuine product
decision, not a small contract fix — it means:
- Rewriting that settings-screen copy for Android specifically (the real
  native alarm *does* loop, ring through Do Not Disturb, and show a
  full-screen intent over the lock screen — a real alarm-clock experience,
  contradicting today's shipped "neither platform" claim).
- Adding an exact-alarm permission flow (catch
  `ERR_IBADAH_NATIVE_EXACT_ALARM_PERMISSION`, call the new
  `openExactAlarmSettings()`, retry) somewhere in the settings UI.
- Deciding whether Android keeps the notification fallback as a backstop
  or drops it entirely once the native alarm is proven reliable on real
  devices/OEMs.

This was flagged rather than guessed at, per this pass's own scope (a
"clear, safe fix" for a contract mismatch, not a cross-cutting UX/product
change). The native Android code is ready and does not need to be touched
to make this switch later — only JS wiring (`wakeAlarmScheduling.ts`,
`WakeAlarmSettingsScreen.tsx`) and a copy update would be needed.

---

## New files, by feature

### 1. Prayer-time engine (real, no native code involved)
- `src/lib/prayerTimes.ts` — pure `adhan-js` wrapper: coordinates + calc
  method + madhab + a `Date` in, real prayer times / Qibla direction out.
- `src/services/prayerSettings.ts` — Supabase CRUD for `prayer_calc_settings`
  (location, timezone, calculation method, madhab).
- `src/screens/prayer/PrayerLocationSettingsSheet.tsx` — lets a user view/
  change saved location + calc settings after first run (uses
  `expo-location`).
- `supabase/migrations/0009_prayer_calc_settings.sql` — the backing table.

### 2. Ibadah Lock — Android app-blocking (real implementation)
- `modules/expo-ibadah-native/android/src/main/java/expo/modules/ibadahnative/`:
  `IbadahNativeModule.kt` (bridge), `IbadahBlockingAccessibilityService.kt`
  (the actual enforcement — an `AccessibilityService` watching foreground-
  app switches), `IbadahBlockingPrefs.kt` (`SharedPreferences`-backed
  handoff between JS and the service), `BlockedActivity.kt` (a plain,
  code-only "still locked" screen).
- `modules/expo-ibadah-native/android/src/main/res/xml/accessibility_service_config.xml`,
  `AndroidManifest.xml`, `build.gradle` — service registration + the
  package-visibility `<queries>` exemption needed to enumerate installed apps
  on API 30+.
- `src/services/ibadahLock.ts` — Supabase CRUD for `blocked_apps` /
  `emergency_overrides`, plus goal-locked focus session helpers.
- `src/screens/focus/FocusSetupScreen.tsx`, `FocusActiveScreen.tsx`,
  `EmergencyHistoryScreen.tsx` — the Ibadah Lock UI (pick apps, start/stop
  a locked focus session, view emergency-override history).
- `supabase/migrations/0010_ibadah_lock.sql` — `focus_sessions.goal_id`,
  `blocked_apps`, `emergency_overrides`.

### 3. Ibadah Lock — iOS app-blocking (real Screen Time code, non-functional until entitled)
- `modules/expo-ibadah-native/ios/IbadahNativeModule.swift` — bridge; app-
  blocking functions call Apple's `FamilyControls`/`ManagedSettings` APIs for
  real. Wake-alarm functions are honest "not implemented" stubs (Android-only
  feature for now).
- `modules/expo-ibadah-native/ios/IbadahLockSupport.swift` — opaque
  `ApplicationToken` <-> base64 string coding (Apple never exposes a real
  bundle id/name to third-party code).
- `modules/expo-ibadah-native/ios/FamilyActivityPickerPresenter.swift` —
  SwiftUI wrapper presenting Apple's `FamilyActivityPicker`.
- `modules/expo-ibadah-native/ios/DeviceActivityMonitorExtension/
  IbadahDeviceActivityMonitor.swift` + `Info.plist` — **scaffolding only**,
  not wired into a real Xcode extension target (not possible from this
  sandbox — see `docs/ios-family-controls-entitlement.md` §3). Not needed for
  basic blocking to work.
- `modules/expo-ibadah-native/ios/IbadahNative.podspec` — module podspec.
- `docs/ios-family-controls-entitlement.md` — what you must do with Apple
  (see below).

### 4. Wake-verified alarm — Android native (real implementation, not yet wired into scheduling — see "Known gap" above)
- `modules/expo-ibadah-native/android/.../WakeAlarmScheduler.kt` (thin
  `AlarmManager.setAlarmClock()` wrapper — chosen specifically because it's
  the one API never deferred by Doze/battery saver), `WakeAlarmController.kt`
  (facade `IbadahNativeModule.kt` calls), `WakeAlarmReceiver.kt` (alarm-fired
  broadcast receiver), `WakeAlarmRingingService.kt` (foreground service that
  actually loops the ringtone + posts the full-screen-intent notification),
  `WakeAlarmFullScreenActivity.kt` (gets something on top of a locked screen,
  hands off to the RN app's `WakeScanScreen` via `ibtida://wake-scan?...`),
  `WakeAlarmBootReceiver.kt` (re-registers pending alarms after reboot —
  `AlarmManager` doesn't survive one), `WakeAlarmPrefs.kt` (durable
  `SharedPreferences` record of scheduled alarms), `WakeAlarmEventBus.kt`
  (in-process pub/sub to the JS-facing `Module`).
- Extra `AndroidManifest.xml` permissions: `SCHEDULE_EXACT_ALARM`,
  `USE_FULL_SCREEN_INTENT`, `FOREGROUND_SERVICE(_MEDIA_PLAYBACK)`,
  `WAKE_LOCK`, `RECEIVE_BOOT_COMPLETED`, `POST_NOTIFICATIONS`.
- `plugins/withIbadahAndroidManifest.js` — a small config plugin adding
  `showWhenLocked`/`turnScreenOn` to the host app's own `MainActivity`
  (defense-in-depth for a future direct-to-app full-screen route).

### 5. Wake-verified alarm — iOS fallback + cross-platform scheduling (this is what's actually live today)
- `src/services/wakeAlarmScheduling.ts` — the real, live scheduling path on
  **both** platforms today: a rolling 10-day window of precise `expo-
  notifications` one-shot `DATE`-trigger notifications (computed per-day via
  `prayerTimes.ts`, since real prayer times drift and a fixed `daily` trigger
  would go wrong within weeks). Documents at length why this exists and its
  real limits.
- `app.json`'s `ios.infoPlist.NSSupportsTimeSensitiveNotifications: true` —
  lets these notifications use `interruptionLevel: 'timeSensitive'` to
  better break through Focus/DND.
- `src/services/wakeAlarm.ts` — Supabase CRUD for `prayer_alarm_settings`
  (per-prayer enabled flag, verification token) and `wake_verifications`
  (append-only log of successful scans).
- `src/screens/shared/WakeScanScreen.tsx` (generic QR-scan-and-report,
  `expo-camera`-based, no domain knowledge), `WakeAlarmScanScreen.tsx`
  (wake-alarm-specific: compares scan against the real token, logs a
  verification, now also calls `stopWakeAlarmRinging` — see "What was fixed"
  above), `PrayerMatTagScreen.tsx` (renders/regenerates the printable QR tag,
  `react-native-qrcode-svg`-based), `WakeAlarmSettingsScreen.tsx` (per-prayer
  toggle + honest copy about what this alarm is and isn't).
- `supabase/migrations/0011_wake_alarm.sql` — `prayer_alarm_settings`,
  `wake_verifications`.

### Shared/contract file
- `modules/expo-ibadah-native/index.ts` — the one stable TS surface both
  platforms' native code implements against; `expo-module.config.json`
  registers the module for both platforms' autolinking.

---

## What you need to do that nobody here could do

### 1. Push the new database migrations
Nothing in this repo has ever touched a live Supabase project. Run, from the
repo root, once you have a project linked:

```sh
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

This applies `0009_prayer_calc_settings.sql`, `0010_ibadah_lock.sql`, and
`0011_wake_alarm.sql` (and anything else in `supabase/migrations/` not yet
applied) in order. See `supabase/README.md` for the SQL-editor alternative
and the full migration table. All three new migrations use `create table if
not exists` and are safe to run against a project that already has
`0001`–`0008` applied.

### 2. Request the iOS Family Controls entitlement from Apple
Full walkthrough in `docs/ios-family-controls-entitlement.md`. Short version:
sign in to developer.apple.com as the account this app will ship under,
request the **Family Controls** capability (Account → Additional
Capabilities), describe the "individual/self-restriction" use case (not
parental controls), and wait — Apple reviews every request manually
(historically days to weeks) and **approval is not guaranteed**. Only after
approval can you enable it on this app's App ID and add the capability in
Xcode's Signing & Capabilities. Until then, `isAppBlockingSupported()`
correctly reports `false` on iOS and `pickAppsToBlock()` fails with a clear,
catchable authorization error — the app does not crash or silently
misbehave, it just can't block anything yet.

### 3. Build and test on a real device/emulator — nothing here could do this
This sandbox has Node/Java/Gradle binaries only — no Android SDK, no
emulator, no Xcode. You need to, using your own accounts/machine, one of:
- **`eas build --profile development`** (after `eas login` with your own
  Expo account) — builds a real development client in Expo's cloud, for
  either platform.
- Or locally: `npx expo prebuild` to generate the native `android/`/`ios/`
  projects, then open in Android Studio (assemble + run on a device/AVD) or
  Xcode (build + run on a device/simulator — note: Family Controls requires
  a **real device**, it does not work in the iOS Simulator at all, per
  Apple's own documentation).

Specifically verify, since none of it has ever run:
- **Android app-blocking**: enable the Accessibility Service manually in
  Android Settings (there is no programmatic grant), pick a couple of apps
  in `FocusSetupScreen`, start a locked session, confirm opening a blocked
  app redirects home / shows `BlockedActivity`, confirm `stopBlocking`
  actually releases it.
- **Android wake alarm**: this native path is unused by the app today (see
  "Known gap" above) — nothing to test here unless you first wire
  `wakeAlarmScheduling.ts` to call it.
- **iOS app-blocking**: only testable after the entitlement is granted and
  built with it; until then, confirm the app degrades gracefully (it should
  — `isAppBlockingSupported()` returns `false`, `FocusSetupScreen` should
  reflect that).
- **Wake-verification notification flow (both platforms, live today)**:
  toggle a prayer on in `WakeAlarmSettingsScreen`, confirm a notification
  permission prompt appears, confirm the notification fires near the real
  computed prayer time, tapping it opens `WakeAlarmScanScreen`, scanning the
  correct QR tag (from `PrayerMatTagScreen`) logs a verification and a wrong/
  regenerated tag is rejected with a retry.
- **Prayer times**: confirm computed times look correct for your real
  location/calculation method/madhab combination against a known-good source.

## Real-world limitations, honestly, per feature

**Android app-blocking** uses an `AccessibilityService` to watch foreground-
app switches — the only mechanism a third-party Android app has for this
short of being a device-owner/MDM app. This is exactly the kind of use
Google Play's Accessibility API policy singles out for extra review
scrutiny: Play Store review can and does reject or remove apps over an
undisclosed non-accessibility use of this API, so the Play Console listing
must clearly disclose it's used for self-imposed app-blocking, not
disability assistance. Separately, OEM battery-optimization behavior varies
a lot (some Android skins aggressively kill background services/accessibility
services to save power) — expect to test on more than one manufacturer's
device before trusting this in the field, and expect some devices to need
the user to manually exempt the app from battery optimization.

**iOS app-blocking** is real, complete Swift code against Apple's actual
`FamilyControls`/`ManagedSettings` APIs, but it is completely non-functional
— every authorization call fails — until Apple grants the Family Controls
entitlement to this specific app, a manual, non-instant, non-guaranteed
approval process with no code-level workaround.

**The wake-verification alarm, as actually shipped today (both platforms),
is a strong time-sensitive notification with a verification step, not a
true unstoppable alarm clock.** It rings once as a normal notification
sound, not a looping alarm; a user in Do Not Disturb, or one who force-quit
the app past what notification delivery survives, may not be woken by it in
every case. This is a deliberate, honestly-stated tradeoff (the settings
screen itself says as much to the user) — no third-party app on either
platform gets a true always-wins alarm-clock guarantee without extra,
narrowly-gated entitlements (Critical Alerts on iOS; being the actual system
Clock app on Android). A real native Android alarm (looping, DND-piercing,
full-screen-intent) has been built and is ready, but is not yet wired into
what the app actually schedules — see "Known gap" above for exactly what's
left to do and why it wasn't done automatically in this pass.
