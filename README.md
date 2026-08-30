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

## Known gaps vs. the full design brief

The source `.dc.html` is a static prototype; this port focuses on visual/interaction fidelity and in-memory state. Not yet implemented (flagged in the original design conversation as needing native infrastructure or further design passes):

- Real dark mode (system-aware palette)
- Persistence (AsyncStorage) — state currently resets on reload
- Push notifications / per-category notification scheduling
- Offline-first caching (service-worker equivalent)
- Qibla via live device orientation (currently shows the saved-location bearing)
- Full VoiceOver/TalkBack accessibility pass
- Real Screen Time (iOS) / Usage Access (Android) integration for Ibadah Focus — this needs a native module and platform authorization flow beyond what this port includes
