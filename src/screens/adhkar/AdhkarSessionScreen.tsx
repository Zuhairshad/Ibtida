import React, { useRef, useState } from 'react';
import { Animated, PanResponder, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { nav } from '../../navigation/navigate';
import { RootStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import Toast from '../../components/Toast';
import { ChevronLeftIcon } from '../../theme/icons';
import { ADHKAR_CONTENT } from '../../state/adhkarContent';

function tapBuzz() {
  try { Haptics.selectionAsync(); } catch { /* no-op */ }
}

export default function AdhkarSessionScreen() {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<RootStackParamList, 'AdhkarSession'>>();
  const { category } = route.params;

  const dhikrList = ADHKAR_CONTENT[category] ?? [];
  const [index, setIndex] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);

  const isSwipeMode = category === 'morning' || category === 'evening';
  const translateX = useRef(new Animated.Value(0)).current;

  // Keep ref in sync on every render so the panResponder closure is always current.
  const indexRef = useRef(0);
  indexRef.current = index;

  const current = dhikrList[index];
  const isLast = index === dhikrList.length - 1;
  const progress = dhikrList.length > 0 ? (index + 1) / dhikrList.length : 0;
  const categoryLabel = category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        (category === 'morning' || category === 'evening') && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8,
      onPanResponderMove: (_, { dx }) => { translateX.setValue(dx); },
      onPanResponderRelease: (_, { dx, vx }) => {
        const THRESHOLD = 80;
        const VEL = 0.7;
        const cur = indexRef.current;
        const total = dhikrList.length;
        const goNext = dx < -THRESHOLD || (dx < -20 && vx < -VEL);
        const goPrev = dx > THRESHOLD || (dx > 20 && vx > VEL);
        if (goNext) {
          if (cur >= total - 1) {
            tapBuzz();
            Animated.timing(translateX, { toValue: -420, duration: 160, useNativeDriver: true }).start(() => {
              setComplete(true);
            });
          } else {
            tapBuzz();
            Animated.timing(translateX, { toValue: -420, duration: 180, useNativeDriver: true }).start(() => {
              setIndex(cur + 1);
              translateX.setValue(420);
              Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }).start();
            });
          }
        } else if (goPrev) {
          if (cur > 0) {
            tapBuzz();
            Animated.timing(translateX, { toValue: 420, duration: 180, useNativeDriver: true }).start(() => {
              setIndex(cur - 1);
              translateX.setValue(-420);
              Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }).start();
            });
          } else {
            Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
          }
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
        }
      },
    })
  ).current;

  const onContinue = () => {
    tapBuzz();
    const cur = indexRef.current;
    const total = dhikrList.length;
    if (cur >= total - 1) {
      if (isSwipeMode) {
        setComplete(true);
      } else {
        setToast('Session complete!');
        setTimeout(() => nav.adhkar(), 1200);
      }
    } else {
      if (isSwipeMode) {
        Animated.timing(translateX, { toValue: -420, duration: 180, useNativeDriver: true }).start(() => {
          setIndex(cur + 1);
          translateX.setValue(420);
          Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }).start();
        });
      } else {
        setIndex(cur + 1);
      }
    }
  };

  if (complete) {
    return (
      <ScreenFade duration={280} style={{ flex: 1, backgroundColor: colors.bgTint }}>
        <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
          <PressableScale onPress={nav.adhkar} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <ChevronLeftIcon color={colors.inkMuted} />
            <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>{categoryLabel}</Text>
          </PressableScale>
        </View>
        <View style={{ flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <View style={{ borderRadius: 28, backgroundColor: colors.successTint, padding: 32, width: '100%', alignItems: 'center' }}>
            <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.success, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 28, color: '#FFFFFF', fontWeight: '700' }}>✓</Text>
            </View>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#2F6B45', textAlign: 'center' }}>Alhamdulillah!</Text>
            <Text style={{ fontSize: 15, color: '#2F6B45', marginTop: 8, textAlign: 'center' }}>{categoryLabel} complete</Text>
            <Text style={{ fontSize: 13, color: '#2F6B45', marginTop: 6, opacity: 0.75, textAlign: 'center' }}>{dhikrList.length} adhkar recited</Text>
          </View>
          <PressableScale
            onPress={nav.adhkar}
            scaleTo={0.98}
            style={{ minHeight: 56, width: '100%', borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>Done</Text>
          </PressableScale>
        </View>
      </ScreenFade>
    );
  }

  if (!current) {
    return (
      <ScreenFade duration={280} style={{ flex: 1, backgroundColor: colors.bgTint, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 15, color: colors.inkMuted }}>No content for this category yet.</Text>
        <PressableScale onPress={nav.adhkar} scaleTo={0.97} style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 14, color: colors.primary }}>Go back</Text>
        </PressableScale>
      </ScreenFade>
    );
  }

  const cardContent = (
    <View style={{ borderWidth: 1, borderColor: 'rgba(23,32,28,0.05)', borderRadius: 28, paddingVertical: 28, paddingHorizontal: 22, backgroundColor: '#FFFFFF' }}>
      {current.title ? (
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', color: colors.inkMuted, textAlign: 'center', marginBottom: 16 }}>
          {current.title}
        </Text>
      ) : null}
      <Text style={{ fontFamily: 'ScheherazadeNew_500Medium', lineHeight: 60, color: colors.inkStrong, textAlign: 'center', fontSize: 34, writingDirection: 'rtl' }}>
        {current.arabic}
      </Text>
      <View style={{ height: 1, backgroundColor: colors.divider, marginVertical: 24 }} />
      <Text style={{ fontSize: 14, color: colors.inkSecondary, textAlign: 'center' }}>
        {current.transliteration}
      </Text>
      <Text style={{ fontSize: 17, lineHeight: 26, color: colors.inkStrong, textAlign: 'center', marginTop: 12 }}>
        {current.translation}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22, flexWrap: 'wrap' }}>
        {current.reference ? (
          <View style={{ backgroundColor: colors.bgTint, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10 }}>
            <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.inkStrong }}>{current.reference}</Text>
          </View>
        ) : null}
        <View style={{ backgroundColor: colors.goldTint, paddingVertical: 7, paddingHorizontal: 11, borderRadius: 10 }}>
          <Text style={{ fontSize: 11.5, fontWeight: '500', color: colors.goldInk }}>{current.count} ×</Text>
        </View>
      </View>
    </View>
  );

  return (
    <ScreenFade duration={280} style={{ backgroundColor: colors.bgTint }}>
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 24, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <PressableScale onPress={nav.adhkar} scaleTo={1} style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
          <Text style={{ fontSize: 14, fontWeight: '500', color: colors.inkMuted }}>{categoryLabel}</Text>
        </PressableScale>
        <Text style={{ fontSize: 12.5, fontWeight: '600', color: colors.inkMuted }}>
          {index + 1} / {dhikrList.length}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ height: 5, flex: 1, borderRadius: 3, backgroundColor: 'rgba(23,32,28,0.08)', overflow: 'hidden' }}>
          <View style={{ height: '100%', width: `${progress * 100}%`, backgroundColor: colors.success, borderRadius: 3 }} />
        </View>
      </View>

      {isSwipeMode ? (
        <Animated.View
          style={{ paddingHorizontal: 24, paddingTop: 18, transform: [{ translateX }] }}
          {...panResponder.panHandlers}
        >
          {cardContent}
          <Text style={{ fontSize: 11.5, color: colors.inkMuted, textAlign: 'center', marginTop: 14 }}>
            Swipe left for next · right to go back
          </Text>
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 18 }}>
          {cardContent}
        </ScrollView>
      )}

      <View style={{ paddingHorizontal: 24, paddingBottom: insets.bottom + 20, paddingTop: 14 }}>
        <PressableScale
          onPress={onContinue}
          scaleTo={0.99}
          style={{ minHeight: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ fontSize: 16, fontWeight: '600', color: '#FFFFFF' }}>
            {isLast ? 'Complete' : isSwipeMode ? 'Next' : 'Continue'}
          </Text>
        </PressableScale>
      </View>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </ScreenFade>
  );
}
