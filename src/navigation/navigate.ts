// Imperative navigation helpers mirroring the prototype's flat `nav.<screen>`
// object (built from its SCREENS registry via `this.go(id)`). Using the
// RootNavigation-ref pattern keeps every screen's onPress handlers simple —
// `nav.tasbeeh()` — regardless of which nested tab stack it needs to reach.
import { createNavigationContainerRef } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

export const navigationRef = createNavigationContainerRef();

function buzz() {
  try {
    Haptics.selectionAsync();
  } catch {
    // no-op — matches the prototype's try/catch around navigator.vibrate
  }
}

function go(name: string, params?: object) {
  if (!navigationRef.isReady()) return;
  buzz();
  // @ts-expect-error — heterogeneous nested-navigator route names
  navigationRef.navigate(name, params);
}

export const nav = {
  welcome: () => go('Welcome'),
  intentions: () => go('Intentions'),
  home: () => go('Tabs', { screen: 'DashboardTab', params: { screen: 'Home' } }),
  prayer: () => go('Tabs', { screen: 'PrayersTab' }),
  prayerDetail: (prayerName: string) => go('PrayerDetail', { prayerName }),
  adhkar: () => go('Tabs', { screen: 'AdhkarTab', params: { screen: 'Adhkar' } }),
  adhkarSession: () => go('AdhkarSession'),
  tasbeeh: () => go('Tabs', { screen: 'AdhkarTab', params: { screen: 'Tasbeeh2' } }),
  goals: () => go('Tabs', { screen: 'AdhkarTab', params: { screen: 'Goals' } }),
  goalNew: () => go('GoalNew'),
  goalComplete: () => go('GoalComplete'),
  progress: () => go('Tabs', { screen: 'AdhkarTab', params: { screen: 'Progress2' } }),
  community: () => go('Tabs', { screen: 'CommunityTab', params: { screen: 'Community' } }),
  communityGoal: (id = 0) => go('Tabs', { screen: 'CommunityTab', params: { screen: 'CommunityGoal2', params: { id } } }),
  circles: () => go('Tabs', { screen: 'CommunityTab', params: { screen: 'Circles2' } }),
  quran: () => go('Tabs', { screen: 'DashboardTab', params: { screen: 'Quran' } }),
  quranReader: () => go('QuranReader'),
  focusSetup: () => go('FocusSetup'),
  focusActive: () => go('FocusActive'),
  profile: () => go('Tabs', { screen: 'ProfileTab', params: { screen: 'Profile' } }),
  privacy: () => go('Tabs', { screen: 'ProfileTab', params: { screen: 'Privacy2' } }),
  error: () => go('ErrorState'),
  back: () => {
    buzz();
    if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
  },
};
