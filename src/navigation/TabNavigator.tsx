import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import CustomTabBar from './CustomTabBar';
import { TabParamList, AdhkarStackParamList, CommunityStackParamList, QuranStackParamList } from './types';

import HomeScreen from '../screens/home/HomeScreen';
import PrayerScreen from '../screens/prayer/PrayerScreen';
import AdhkarScreen from '../screens/adhkar/AdhkarScreen';
import GoalsScreen from '../screens/adhkar/GoalsScreen';
import TasbeehScreen from '../screens/adhkar/TasbeehScreen';
import ProgressScreen from '../screens/adhkar/ProgressScreen';
import CommunityScreen from '../screens/community/CommunityScreen';
import CommunityGoalScreen from '../screens/community/CommunityGoalScreen';
import CirclesScreen from '../screens/community/CirclesScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import PrivacyScreen from '../screens/profile/PrivacyScreen';
import QuranScreen from '../screens/quran/QuranScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const HomeStack = createNativeStackNavigator<QuranStackParamList & { Home: undefined }>();
const AdhkarStack = createNativeStackNavigator<AdhkarStackParamList & { Tasbeeh2: undefined; Progress2: undefined }>();
const CommunityStack = createNativeStackNavigator<CommunityStackParamList & { CommunityGoal2: { id: number }; Circles2: undefined }>();
const ProfileStack = createNativeStackNavigator<{ Profile: undefined; Privacy2: undefined }>();

// Each tab owns a small nested stack so screens that keep the bottom tab bar
// visible in the source design (Tasbeeh, Goals, Progress, CommunityGoal,
// Circles, Privacy, Quran) stay under their tab while it stays on screen —
// only the non-tabbed full-screen flows (AdhkarSession, GoalNew,
// GoalComplete, QuranReader, FocusSetup/Active, PrayerDetail) live in the
// root stack in App.tsx.
function HomeTabStack() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
      <HomeStack.Screen name="Quran" component={QuranScreen} />
    </HomeStack.Navigator>
  );
}

function AdhkarTabStack() {
  return (
    <AdhkarStack.Navigator screenOptions={{ headerShown: false }}>
      <AdhkarStack.Screen name="Adhkar" component={AdhkarScreen} />
      <AdhkarStack.Screen name="Goals" component={GoalsScreen} />
      <AdhkarStack.Screen name="Tasbeeh2" component={TasbeehScreen} />
      <AdhkarStack.Screen name="Progress2" component={ProgressScreen} />
    </AdhkarStack.Navigator>
  );
}

function CommunityTabStack() {
  return (
    <CommunityStack.Navigator screenOptions={{ headerShown: false }}>
      <CommunityStack.Screen name="Community" component={CommunityScreen} />
      <CommunityStack.Screen name="CommunityGoal2" component={CommunityGoalScreen} />
      <CommunityStack.Screen name="Circles2" component={CirclesScreen} />
    </CommunityStack.Navigator>
  );
}

function ProfileTabStack() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      <ProfileStack.Screen name="Privacy2" component={PrivacyScreen} />
    </ProfileStack.Navigator>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tab.Screen name="DashboardTab" component={HomeTabStack} />
      <Tab.Screen name="PrayersTab" component={PrayerScreen} />
      <Tab.Screen name="AdhkarTab" component={AdhkarTabStack} />
      <Tab.Screen name="CommunityTab" component={CommunityTabStack} />
      <Tab.Screen name="ProfileTab" component={ProfileTabStack} />
    </Tab.Navigator>
  );
}
