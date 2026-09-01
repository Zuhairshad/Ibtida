# Graph Report - Ibtida  (2026-08-31)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 739 nodes · 1914 edges · 78 communities (42 shown, 32 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `751e4542`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 36
- Community 37
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 74
- Community 76

## God Nodes (most connected - your core abstractions)
1. `useAuth()` - 59 edges
2. `colors` - 44 edges
3. `PressableScale()` - 36 edges
4. `nav` - 31 edges
5. `Toast()` - 23 edges
6. `ScreenFade()` - 18 edges
7. `FocusActiveScreen()` - 18 edges
8. `CircleDetailScreen()` - 14 edges
9. `PrayerScreen()` - 14 edges
10. `supabase` - 14 edges

## Surprising Connections (you probably didn't know these)
- `FocusSetupScreen()` --calls--> `pickAppsToBlock()`  [EXTRACTED]
  src/screens/focus/FocusSetupScreen.tsx → modules/expo-ibadah-native/index.ts
- `FocusActiveScreen()` --calls--> `startBlocking()`  [EXTRACTED]
  src/screens/focus/FocusActiveScreen.tsx → modules/expo-ibadah-native/index.ts
- `FocusActiveScreen()` --calls--> `stopBlocking()`  [EXTRACTED]
  src/screens/focus/FocusActiveScreen.tsx → modules/expo-ibadah-native/index.ts
- `RootNavigator()` --calls--> `syncAllWakeAlarmSchedules()`  [EXTRACTED]
  App.tsx → src/services/wakeAlarmScheduling.ts
- `RootNavigator()` --calls--> `useAuth()`  [EXTRACTED]
  App.tsx → src/state/AuthContext.tsx

## Import Cycles
- None detected.

## Communities (78 total, 32 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (76): Avatar, BarChart(), Props, Props, EmptyState(), Props, Props, PressableScale() (+68 more)

### Community 1 - "Community 1"
Cohesion: 0.08
Nodes (37): GoalNewScreen(), AVATAR_COLORS, avatarColor(), CircleDetailScreen(), initials(), PRIVACY_OPTIONS, Props, CircleNewScreen() (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (23): AdhkarStack, CommunityStack, HomeStack, ProfileStack, Tab, TabNavigator(), AdhkarStackParamList, CommunityStackParamList (+15 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (25): eslint, eslint-config-expo, devDependencies, eslint, eslint-config-expo, react-dom, react-native-web, @types/react (+17 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (22): AdhkarSessionScreen(), tapBuzz(), GoalCompleteScreen(), beadPosition(), BeadRing(), Dhikr, DHIKR_LIST, tapBuzz() (+14 more)

### Community 5 - "Community 5"
Cohesion: 0.16
Nodes (20): ConfirmSheet(), supabase, LoadState, ProfileScreen(), currentOrDefaults(), getPrayerCalcSettings(), getPrayerTimesFromKalimat(), mapRow() (+12 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (22): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, predictiveBackGestureEnabled, expo, android (+14 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (21): ContentType, fetchPrayerTimes(), HadithBook, HadithGrade, headers(), PrayerTimesDay, PrayerTimesResponse, quickSearch() (+13 more)

### Community 8 - "Community 8"
Cohesion: 0.20
Nodes (17): QuranReaderScreen(), QuranScreen(), clampArabicSize(), getOrCreateSettingsRow(), getReaderSettings(), listBookmarks(), QuranReaderSettings, setArabicSize() (+9 more)

### Community 9 - "Community 9"
Cohesion: 0.14
Nodes (16): AnimatedCircle, ProgressRing(), Props, formatBearing(), parseISODateLocal(), qiblaBearing(), DATES, PrayerScreen() (+8 more)

### Community 10 - "Community 10"
Cohesion: 0.15
Nodes (15): HomeSkeleton(), Day, StreakDotRow(), HomeScreen(), STREAK_LABELS, TILE_ICON, TODAY, TODAY_DATE (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.22
Nodes (15): CALC_METHOD_FNS, classifyPrayersForDate(), classifyPrayerTimes(), COMPASS_POINTS, computePrayerTimes(), getNextPrayer(), getNextSalah(), getPrayerCountdownWindow() (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.16
Nodes (14): EmergencyHistoryScreen(), formatEntryDate(), FocusSetupScreen(), addBlockedApp(), AppPlatform, BlockedApp, BlockedAppRow, countOverridesSince() (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.26
Nodes (14): addBlockingEventListener(), beadPosition(), BeadRing(), BLOCKING_SUPPORTED, FocusActiveScreen(), completeGoal(), updateGoalProgress(), endFocusSession() (+6 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (13): PrayerMatTagScreen(), WakeAlarmSettingsScreen(), AlarmConfigRow, getAlarmConfig(), getAllAlarmConfigs(), getOrCreateAlarmConfigRow(), mapConfig(), PrayerAlarmConfig (+5 more)

### Community 15 - "Community 15"
Cohesion: 0.20
Nodes (11): BlockedAppRef, cancelWakeAlarm(), isAppBlockingSupported(), NativeBlockedAppRef, NativeBlockingEvent, NativeWakeAlarmEvent, notImplemented(), pickAppsToBlock() (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.24
Nodes (11): PrayerTimesOfDay, cancelPendingFor(), cancelWakeAlarmSchedule(), notificationIdFor(), requestWakeAlarmNotificationPermission(), salahTimeFor(), syncAllWakeAlarmSchedules(), syncWakeAlarmSchedule() (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (11): Busy, fieldInputStyle, fieldLabelStyle, fieldStyle, inputCardStyle, Mode, WelcomeScreen(), PrivacyScreen() (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.23
Nodes (8): App(), RootNavigator(), Stack, navigationRef, ErrorStateScreen(), configureWakeAlarmNotifications(), isWakeAlarmNotificationData(), isOnboardingComplete()

### Community 19 - "Community 19"
Cohesion: 0.20
Nodes (10): BottomSheetModal(), Props, formatCoordinates(), MADHABS, METHODS, PrayerLocationSettingsSheet(), Props, CalculationMethod (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.25
Nodes (8): emptyPrayerRecord(), getAdhanSettings(), getPrayerLog(), getPrayerLogRange(), PRAYER_NAMES, PrayerName, todayISODate(), toISODate()

### Community 22 - "Community 22"
Cohesion: 0.20
Nodes (10): AppStateContext, AppStateProvider(), buzz(), Ctx, FOCUS_DURATIONS, initialState, NOTIFICATION_CATEGORIES, PRIVACY_OPTIONS (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.24
Nodes (9): formatPrayerTime(), PrayerClassification, LOG_MODES, PrayerDetailScreen(), Props, today, todayDate, PrayerName (+1 more)

### Community 24 - "Community 24"
Cohesion: 0.24
Nodes (9): IntentionsScreen(), AuthContext, AuthContextValue, AuthProvider(), AuthResult, createSessionFromUrl(), looksLikeAuthCallback(), markOnboardingComplete() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.31
Nodes (7): cycleFocusDuration(), FocusSession, FocusSettings, getFocusSettings(), getOrCreateSettingsRow(), SettingsRow, toggleFocusApp()

### Community 26 - "Community 26"
Cohesion: 0.29
Nodes (8): expo-haptics, expo-linear-gradient, dependencies, expo-haptics, expo-linear-gradient, react-native-qrcode-svg, react-native-svg, react-native-svg

### Community 27 - "Community 27"
Cohesion: 0.25
Nodes (7): CATEGORIES, GOALS, PROGRESS_AXIS, PROGRESS_BARS_BY_RANGE, PROGRESS_HEAT, PROGRESS_HEAT_DAYS, PROGRESS_STATS_BY_RANGE

### Community 28 - "Community 28"
Cohesion: 0.36
Nodes (7): notification_settings_set_updated_at, privacy_settings_set_updated_at, public.notification_settings, public.privacy_settings, auth, auth.users, public.set_updated_at

### Community 29 - "Community 29"
Cohesion: 0.43
Nodes (6): stopWakeAlarmRinging(), nativeWakeAlarmId(), Props, WakeAlarmScanScreen(), WakeScanScreen(), logWakeVerification()

### Community 30 - "Community 30"
Cohesion: 0.33
Nodes (6): public.focus_sessions, blocked_apps_set_updated_at, public.blocked_apps, public.emergency_overrides, auth.users, public.set_updated_at

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (4): public.handle_new_user, on_auth_user_created, public.profiles, auth.users

### Community 32 - "Community 32"
Cohesion: 0.38
Nodes (6): adhan_settings_set_updated_at, prayer_logs_set_updated_at, public.adhan_settings, public.prayer_logs, auth.users, public.set_updated_at

### Community 33 - "Community 33"
Cohesion: 0.38
Nodes (6): adhkar_goals_set_updated_at, public.adhkar_goals, public.tasbeeh_sessions, auth.users, public.set_updated_at, tasbeeh_sessions_set_updated_at

### Community 34 - "Community 34"
Cohesion: 0.38
Nodes (6): public.quran_bookmarks, public.quran_reader_settings, quran_reader_settings_set_updated_at, auth, auth.users, public.set_updated_at

### Community 35 - "Community 35"
Cohesion: 0.33
Nodes (6): plugins, expo-notifications, expo-web-browser, expo-notifications, expo-web-browser, ./plugins/withIbadahAndroidManifest

### Community 36 - "Community 36"
Cohesion: 0.73
Nodes (5): public.circle_members, public.community_circles, public.community_goal_members, public.community_goals, auth.users

### Community 37 - "Community 37"
Cohesion: 0.40
Nodes (5): focus_settings_set_updated_at, public.focus_sessions, public.focus_settings, auth.users, public.set_updated_at

### Community 38 - "Community 38"
Cohesion: 0.33
Nodes (5): prayer_calc_settings_set_updated_at, public.prayer_calc_settings, auth, auth.users, public.set_updated_at

### Community 39 - "Community 39"
Cohesion: 0.40
Nodes (5): prayer_alarm_settings_set_updated_at, public.prayer_alarm_settings, public.wake_verifications, auth.users, public.set_updated_at

### Community 40 - "Community 40"
Cohesion: 0.40
Nodes (4): expo/tsconfig.base, compilerOptions, strict, extends

### Community 41 - "Community 41"
Cohesion: 0.40
Nodes (4): CIRCLES, COMMUNITY_GOALS, FEED, LIVE_NOW

### Community 42 - "Community 42"
Cohesion: 0.50
Nodes (4): AdhkarScreen(), GoalsScreen(), listGoals(), mapGoal()

## Knowledge Gaps
- **201 isolated node(s):** `Avatar`, `Props`, `Props`, `Props`, `Props` (+196 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 267 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **32 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Community 26` to `Community 3`, `Community 35`, `Community 48`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `expo-notifications` connect `Community 35` to `Community 16`, `Community 18`?**
  _High betweenness centrality (0.115) - this node is a cross-community bridge._
- **Why does `expo-web-browser` connect `Community 35` to `Community 24`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **What connects `Avatar`, `Props`, `Props` to the rest of the system?**
  _201 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06480558325024925 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07716701902748414 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.10114942528735632 - nodes in this community are weakly interconnected._