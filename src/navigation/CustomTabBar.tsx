import React, { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import PressableScale from '../components/PressableScale';
import { HomeIcon, PrayerIcon, AdhkarIcon, CommunityIcon, ProfileIcon } from '../theme/icons';
import { colors } from '../theme/tokens';

// Flat white floating-icon-and-label bar, 5 destinations, matching the
// prototype's tabDefs exactly: active icon springs up + scales, active ink
// #2A63B8 vs inactive #6B7280. Quran (reached from Home, no owning tab)
// intentionally shows the bar with nothing highlighted, same as the source.
const TAB_META: Record<string, { label: string; Icon: typeof HomeIcon }> = {
  DashboardTab: { label: 'Dashboard', Icon: HomeIcon },
  PrayersTab: { label: 'Prayers', Icon: PrayerIcon },
  AdhkarTab: { label: 'Adhkar', Icon: AdhkarIcon },
  CommunityTab: { label: 'Community', Icon: CommunityIcon },
  ProfileTab: { label: 'Profile', Icon: ProfileIcon },
};

function TabButton({ routeKey, isFocused, onPress }: { routeKey: keyof typeof TAB_META; isFocused: boolean; onPress: () => void }) {
  const meta = TAB_META[routeKey];
  const anim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, { toValue: isFocused ? 1 : 0, useNativeDriver: true, speed: 18, bounciness: 9 }).start();
  }, [isFocused, anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -1] });
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
  const ink = isFocused ? colors.primary : '#6B7280';

  return (
    <PressableScale onPress={onPress} scaleTo={0.9} style={{ flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 6 }}>
      <Animated.View style={{ transform: [{ translateY }, { scale }] }}>
        <meta.Icon size={22} color={ink} />
      </Animated.View>
      <Text style={{ fontSize: 10.5, fontWeight: isFocused ? '600' : '500', letterSpacing: 0.01, color: ink }}>{meta.label}</Text>
    </PressableScale>
  );
}

export default function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const activeRoute = state.routes[state.index];
  const nestedFocused = getFocusedRouteNameFromRoute(activeRoute);
  // Quran is nested under the Dashboard tab's own stack but the source design
  // shows no active tab while reading it — replicate that one exception.
  const suppressActive = nestedFocused === 'Quran';

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: 'rgba(23,32,28,0.07)',
        backgroundColor: '#FFFFFF',
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 2,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 12),
        paddingHorizontal: 6,
      }}
    >
      {state.routes.map((route, index) => {
        const isFocused = state.index === index && !suppressActive;
        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (state.index !== index && !event.defaultPrevented) {
            navigation.navigate(route.name as never);
          }
        };
        return <TabButton key={route.key} routeKey={route.name as keyof typeof TAB_META} isFocused={isFocused} onPress={onPress} />;
      })}
    </View>
  );
}
