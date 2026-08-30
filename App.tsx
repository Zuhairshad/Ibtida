import 'react-native-gesture-handler';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, NotoNaskhArabic_500Medium, NotoNaskhArabic_600SemiBold } from '@expo-google-fonts/noto-naskh-arabic';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider } from './src/state/AppState';
import { AuthProvider, isOnboardingComplete, useAuth } from './src/state/AuthContext';
import { colors } from './src/theme/tokens';
import { RootStackParamList } from './src/navigation/types';
import { navigationRef } from './src/navigation/navigate';

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
import ErrorStateScreen from './src/screens/shared/ErrorStateScreen';
import SearchScreen from './src/screens/shared/SearchScreen';
import NotificationsScreen from './src/screens/shared/NotificationsScreen';
import CircleNewScreen from './src/screens/community/CircleNewScreen';

SplashScreen.preventAutoHideAsync().catch(() => {});

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
        <Stack.Screen name="ErrorState" component={ErrorStateScreen} />
        <Stack.Screen name="Search" component={SearchScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="CircleNew" component={CircleNewScreen} options={{ animation: 'slide_from_bottom' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
