// Route params for the root stack (screens that hide the bottom tab bar,
// matching Ibadah v5.dc.html's TABBED/non-TABBED split) and the tab group.
export type RootStackParamList = {
  Welcome: undefined;
  Intentions: undefined;
  Tabs: undefined;
  PrayerDetail: { prayerName: string };
  AdhkarSession: undefined;
  GoalNew: undefined;
  GoalComplete: undefined;
  QuranReader: undefined;
  FocusSetup: undefined;
  // `goalId`/`target` are set for a goal-locked ("Ibadah Lock") session
  // started from FocusSetupScreen's goal picker; omitted for a plain,
  // unlocked focus session (no app-blocking, no linked adhkar_goals row —
  // see src/services/ibadahLock.ts's startGoalLockedSession vs
  // focus.ts's startFocusSession).
  FocusActive: { goalId: string; target: number } | undefined;
  ErrorState: undefined;
  Search: undefined;
  Notifications: undefined;
  CircleNew: undefined;
  // Own-eyes-only log of past "Ibadah Lock" emergency unlocks — see
  // src/services/ibadahLock.ts's getOverrideHistory.
  EmergencyHistory: undefined;
  // Wake-verified prayer alarm (iOS/Android notification fallback) — see
  // src/services/wakeAlarmScheduling.ts and src/screens/shared/*.
  WakeAlarmSettings: undefined;
  PrayerMatTag: { prayerName: string };
  WakeScan: { prayerName: string; alarmDate: string };
};

export type TabParamList = {
  DashboardTab: undefined;
  PrayersTab: undefined;
  AdhkarTab: undefined;
  CommunityTab: undefined;
  ProfileTab: undefined;
};

// Screens nested inside each tab's own stack — these keep the bottom tab bar
// visible, matching the prototype's TABBED screen list.
export type AdhkarStackParamList = {
  Adhkar: undefined;
  Goals: undefined;
  Tasbeeh2: undefined;
  Progress2: undefined;
};

export type CommunityStackParamList = {
  Community: undefined;
  CommunityGoal2: { id: number };
  Circles2: undefined;
};

export type QuranStackParamList = {
  Home: undefined;
  Quran: undefined;
};

export type ProfileStackParamList = {
  Profile: undefined;
  Privacy2: undefined;
};
