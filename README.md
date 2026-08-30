# Ibtida

A React Native (Expo) implementation of the Ibadah v5 design handoff — a 22-screen Islamic worship-tracking app (prayer times, adhkar, tasbeeh, personal goals, community, Quran, Ibadah Focus).

## Stack

- Expo SDK 57, TypeScript
- React Navigation (bottom tabs + native stack, nested per-tab stacks so the tab bar stays visible on the same screens as the source design)
- `react-native-svg` for the icon set, `expo-haptics`, `@expo-google-fonts/noto-naskh-arabic` for Arabic typography
- All state lives in `src/state/AppState.tsx`, ported 1:1 from the source `.dc.html` prototype's state/logic

## Structure

- `src/theme/` — design tokens (`tokens.ts`) and the icon set (`icons.tsx`), both ported from the source design
- `src/state/` — global app state + static content data (prayer times, categories, goals, community data, Quran)
- `src/components/` — shared components (ProgressRing, SegmentedControl, IconBadgeRow, StreakDotRow, AvatarStack, BarChart, EmptyState, Skeleton, BottomSheetModal, PressableScale)
- `src/navigation/` — root stack, tab navigator, custom tab bar, imperative `nav.*` helpers
- `src/screens/` — one folder per tab group (home, prayer, adhkar, community, profile, quran, focus, onboarding, shared)

## Run

```
npm install
npm run start       # then press i / a / w, or scan the QR code with Expo Go
npm run typecheck   # tsc --noEmit
npm run lint        # eslint
npm run build       # static web export to dist/
```

### This app is no longer plain-Expo-Go-compatible

`modules/expo-ibadah-native/` is a local Expo Module (real Kotlin/Swift) backing
"Ibadah Lock" (app-blocking) and the wake-verified prayer alarm's native pieces.
Once that native code is linked in, `expo-dev-client` is required — plain Expo
Go can no longer run this project. To build and run a dev client:

```
npx expo prebuild            # regenerates ./android and ./ios from app.json + this module
# then either:
npx expo run:android         # or run:ios — needs Android Studio / Xcode locally
# or, without local native toolchains:
eas build --profile development
```

then `npx expo start --dev-client` to iterate on JS as usual. See
`app.json`'s `plugins` array (`expo-camera`, `expo-location`,
`expo-notifications`, plus the local `plugins/withIbadahAndroidManifest.js`)
and `eas.json` for the build profiles. iOS app-blocking additionally needs
Apple's Family Controls entitlement, which is not self-service — see
[`docs/ios-family-controls-entitlement.md`](./docs/ios-family-controls-entitlement.md).
Android's app-blocking needs the user to manually enable an Accessibility
Service in Settings (there's no programmatic grant) and its Play Store
listing must disclose that use, per Play's Accessibility API policy.

## Content governance

No Quran verses, hadith text, or religious rulings are invented anywhere in this app (see `src/state/quranData.ts` and the Adhkar session screen) — content awaiting a licensed source shows an explicit "pending source" state instead of placeholder scripture, matching the source design's governance requirement.

## Navigation map

Five tabs, each owning a nested stack so the tab bar stays visible on the
screens the design keeps it on:

- **Dashboard** — Home, Quran
- **Prayers** — Prayer
- **Adhkar** — Adhkar, Goals, Tasbeeh, Progress
- **Community** — Community, Community goal, Circles
- **Profile** — Profile, Privacy

Full-screen / modal flows live in the root stack (tab bar hidden): Welcome,
Intentions, Prayer detail (sheet), Adhkar session, Goal new, Goal complete,
Quran reader, Focus setup, Focus active, Search, Notifications, New circle,
Error/offline.

## Backend

Ibtida's Supabase backend (schema, RLS policies, client setup) lives in
[`supabase/README.md`](./supabase/README.md); copy [`.env.example`](./.env.example)
to `.env` and fill in your project's URL/anon key to run against it. The
project owner applies the migrations themselves (see that README) — nothing
here connects to a live project on its own.

## Known gaps vs. the full design brief

The source `.dc.html` is a static prototype; this port focuses on visual/interaction fidelity and in-memory state. Not yet implemented (flagged in the original design conversation as needing native infrastructure or further design passes):

- Real dark mode (system-aware palette)
- Offline-first caching (service-worker equivalent)
- Qibla via live device orientation (currently shows the saved-location bearing)
- Full VoiceOver/TalkBack accessibility pass
- `app.json` has no `ios.bundleIdentifier` / `android.package` set yet — required before `expo prebuild`/`eas build` can produce a real, installable/archivable app; the project owner needs to pick and set these
- The Android/iOS native wake-alarm mechanisms in `modules/expo-ibadah-native` (real `AlarmManager` full-screen alarm on Android; the iOS side is intentionally notification-only, see below) are built but not yet called from JS — today's wake-verification alarm (`src/services/wakeAlarmScheduling.ts`) uses `expo-notifications` local notifications on both platforms instead, since iOS has no true third-party alarm-clock API to match; wiring Android's native alarm path in is a possible follow-up, not done in this pass
- iOS Family Controls entitlement for Ibadah Lock is not self-service — needs the project owner's own Apple Developer account approval; see `docs/ios-family-controls-entitlement.md`
- Android's Ibadah Lock uses an `AccessibilityService` for enforcement, which needs a clear Play Store listing disclosure or risks review rejection (see that module's own doc comments)

Real prayer-time calculation (`adhan-js`-backed, per-user location + calculation method), "Ibadah Lock" app-blocking, and the wake-verified prayer alarm (QR-tag scan proves you're up) have since landed — see `supabase/README.md`'s migration table and the "Run" section above for the native/dev-client setup they now require.
