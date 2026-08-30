import 'react-native-gesture-handler';
import React, { useCallback, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts, NotoNaskhArabic_500Medium, NotoNaskhArabic_600SemiBold } from '@expo-google-fonts/noto-naskh-arabic';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppStateProvider } from './src/state/AppState';
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
      <AppStateProvider>
        <StatusBar style="dark" />
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
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
          </Stack.Navigator>
        </NavigationContainer>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}
