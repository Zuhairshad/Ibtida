import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, AppState, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, type NativeStackScreenProps } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { useFonts, NotoNaskhArabic_500Medium, NotoNaskhArabic_600SemiBold } from '@expo-google-fonts/noto-naskh-arabic';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider } from './src/state/AppState';
import { AuthProvider, isOnboardingComplete, useAuth } from './src/state/AuthContext';
import { colors } from './src/theme/tokens';
import { RootStackParamList } from './src/navigation/types';
import { navigationRef, nav } from './src/navigation/navigate';
import type { PrayerName } from './src/services/prayers';
import { configureWakeAlarmNotifications, syncAllWakeAlarmSchedules, isWakeAlarmNotificationData } from './src/services/wakeAlarmScheduling';

import WelcomeScreen from './src/screens/onboarding/WelcomeScreen';
import IntentionsScreen from './src/screens/onboarding/IntentionsScreen';
import TabNavigator from './src/navigation/TabNavigator';
import PrayerDetailScreen from './src/screens/prayer/PrayerDetailScreen';
import AdhkarSessionScreen from './src/screens/adhkar/AdhkarSessionScreen';
import GoalNewScreen from './src/screens/adhkar/GoalNewScreen';
import GoalCompleteScreen from './src/screens/adhkar/GoalCompleteScreen';
import QuranReaderScreen from './src/screens/quran/QuranReaderScreen';
import FocusSetupScreen from './src/screens/focus/FocusSetupScreen';
import FocusActiveScreen from './src/screens/focus/FocusActiveScreen';
import EmergencyHistoryScreen from './src/screens/focus/EmergencyHistoryScreen';
import ErrorStateScreen from './src/screens/shared/ErrorStateScreen';
import SearchScreen from './src/screens/shared/SearchScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import CircleNewScreen from './src/screens/community/CircleNewScreen';
import WakeAlarmSettingsScreen from './src/screens/shared/WakeAlarmSettingsScreen';
import PrayerMatTagScreen from './src/screens/shared/PrayerMatTagScreen';
import WakeAlarmScanScreen from './src/screens/shared/WakeAlarmScanScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Thin route-param -> props adapters for the two shared wake-alarm screens
// that take plain component props rather than a `{ route }` shape of their
// own (both are reused outside the stack too — see their own files) —
// mirrors how PrayerDetailScreen casts its own `route.params.prayerName`
// string to the PrayerName union.
function PrayerMatTagRoute({ route }: NativeStackScreenProps<RootStackParamList, 'PrayerMatTag'>) {
  return <PrayerMatTagScreen prayerName={route.params.prayerName as PrayerName} />;
}
function WakeScanRoute({ route }: NativeStackScreenProps<RootStackParamList, 'WakeScan'>) {
  return <WakeAlarmScanScreen prayerName={route.params.prayerName as PrayerName} alarmDate={route.params.alarmDate} />;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    NotoNaskhArabic_500Medium,
    NotoNaskhArabic_600SemiBold,
  });

  const onLayout = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  useEffect(() => {
    onLayout();
  }, [onLayout]);

  // Sets the notification presentation handler + Android channel for the
  // wake-verification alarm. Needs no signed-in user, so this runs once at
  // app start rather than inside RootNavigator — see
  // src/services/wakeAlarmScheduling.ts.
  useEffect(() => {
    configureWakeAlarmNotifications();
  }, []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      {/* AuthProvider sits outside AppStateProvider: auth (who's signed in)
          is a prerequisite for the rest of the app's state, not a peer of it,
          and this ordering lets AppStateProvider (or anything under it) call
          useAuth() later without a second wrapper. */}
      <AuthProvider>
        <AppStateProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AppStateProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

// Auth gate: unauthenticated users can only reach Welcome (now a full sign-in
// / sign-up UI); authenticated users land on Intentions once (first run after
// signup, tracked per-user in AsyncStorage — see isOnboardingComplete in
// AuthContext.tsx) and on Tabs every time after. `key={initialRoute}` forces
// the Navigator to remount when the computed category changes (signed out ->
// signed in, or first-run -> onboarded), which is the standard way to re-pick
// `initialRouteName` in React Navigation — it does not update on its own.
function RootNavigator() {
  const { session, loading: authLoading } = useAuth();
  const userId = session?.user.id;
  // Keyed by userId so switching users (or signing out) never needs a
  // synchronous "reset to null" inside the effect below — `onboarded` is
  // derived from whether this state's userId still matches the live one.
  const [onboardedState, setOnboardedState] = useState<{ userId: string; done: boolean } | null>(null);

  useEffect(() => {
    if (!userId || onboardedState?.userId === userId) return;
    let cancelled = false;
    isOnboardingComplete(userId).then((done) => {
      if (!cancelled) setOnboardedState({ userId, done });
    });
    return () => {
      cancelled = true;
    };
  }, [userId, onboardedState]);

  // Keeps the rolling window of scheduled wake-alarm notifications topped up
  // (see services/wakeAlarmScheduling.ts's file header for why this needs
  // re-running periodically, not just once): on sign-in, and again every
  // time the app comes back to the foreground.
  useEffect(() => {
    if (!userId) return;
    syncAllWakeAlarmSchedules(userId).catch(() => {
      // Best-effort — a failed sync just leaves the previous schedule (or
      // none) in place; the next foreground/launch tries again.
    });
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        syncAllWakeAlarmSchedules(userId).catch(() => {});
      }
    });
    return () => sub.remove();
  }, [userId]);

  // Deep-links a tapped wake-alarm notification (cold start or from the
  // background — `useLastNotificationResponse` covers both, per
  // expo-notifications' own docs) to the QR-scan confirmation screen.
  // Cleared after handling so re-rendering (or the next unrelated
  // notification tap) doesn't re-navigate to a stale one.
  const lastNotificationResponse = Notifications.useLastNotificationResponse();
  useEffect(() => {
    if (!lastNotificationResponse) return;
    const data = lastNotificationResponse.notification.request.content.data;
    if (isWakeAlarmNotificationData(data)) {
      nav.wakeScan(data.prayerName, data.alarmDate);
    }
    Notifications.clearLastNotificationResponse();
  }, [lastNotificationResponse]);

  const onboarded = onboardedState !== null && onboardedState.userId === userId ? onboardedState.done : null;
  const stillChecking = authLoading || (!!userId && onboarded === null);
  if (stillChecking) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const initialRoute: keyof RootStackParamList = !session ? 'Welcome' : onboarded ? 'Tabs' : 'Intentions';

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator key={initialRoute} screenOptions={{ headerShown: false }} initialRouteName={initialRoute}>
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Intentions" component={IntentionsScreen} />
        <Stack.Screen name="Tabs" component={TabNavigator} />
        <Stack.Screen name="PrayerDetail" component={PrayerDetailScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
        <Stack.Screen name="AdhkarSession" component={AdhkarSessionScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="GoalNew" component={GoalNewScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="GoalComplete" component={GoalCompleteScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="QuranReader" component={QuranReaderScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="FocusSetup" component={FocusSetupScreen} options={{ animation: 'slide_from_bottom' }} />
        <Stack.Screen name="FocusActive" component={FocusActiveScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="EmergencyHistory" component={EmergencyHistoryScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="ErrorState" component={ErrorStateScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="WakeAlarmSettings" component={WakeAlarmSettingsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="PrayerMatTag" component={PrayerMatTagRoute} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="WakeScan" component={WakeScanRoute} options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="CircleNew" component={CircleNewScreen} options={{ animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
