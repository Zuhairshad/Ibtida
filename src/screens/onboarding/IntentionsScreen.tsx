import React, { useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppState } from '../../state/AppState';
import { markOnboardingComplete, useAuth } from '../../state/AuthContext';
import { nav } from '../../navigation/navigate';
import { arabicFont, colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import PrimaryButton from '../../components/PrimaryButton';
import { CheckIcon } from '../../theme/icons';

// ─── Local palette ────────────────────────────────────────────────────────────
const IVORY = '#FAF8F3';
const GOLD = '#C9A96E';
const ICON_BG = '#F0E8D4';

// ─── Slide data ───────────────────────────────────────────────────────────────
const SLIDES: { icon: string; title: string; sub: string }[] = [
  {
    icon: '🤲',
    title: 'The five daily prayers',
    sub: 'Track each salah, and make up what you miss without losing count.',
  },
  {
    icon: '📿',
    title: 'Daily dhikr',
    sub: 'A count you keep without thinking about it — tasbeeh on autopilot.',
  },
  {
    icon: '📖',
    title: 'Reading Quran',
    sub: 'A few pages, most days. Every āyah tallied, no pressure to finish fast.',
  },
  {
    icon: '🌅',
    title: 'Morning and evening adhkar',
    sub: 'Two short habits book-ending each day, morning and after Asr.',
  },
  {
    icon: '📱',
    title: 'Less time on my phone',
    sub: 'Worship before scrolling — a focus mode that puts ibādah first.',
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Total pages = SLIDES + 1 final "You're all set" slide
const TOTAL_PAGES = SLIDES.length + 1;
const FINAL_PAGE = SLIDES.length; // 0-indexed

// ─── Component ────────────────────────────────────────────────────────────────
export default function IntentionsScreen() {
  const { state, toggleIntent } = useAppState();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const scrollRef = useRef<ScrollView>(null);
  const [activePage, setActivePage] = useState(0);

  const onContinue = () => {
    if (user) markOnboardingComplete(user.id);
    nav.home();
  };

  const goToPage = (page: number) => {
    scrollRef.current?.scrollTo({ x: page * SCREEN_WIDTH, animated: true });
    setActivePage(page);
  };

  const onNext = () => {
    const next = Math.min(activePage + 1, FINAL_PAGE);
    goToPage(next);
  };

  const onMomentumScrollEnd = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const page = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActivePage(page);
  };

  return (
    <ScreenFade duration={350} style={{ flex: 1, backgroundColor: IVORY }}>
      {/* Horizontal paged scroll */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumScrollEnd}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
      >
        {/* ── Intention slides (0 – 4) ──────────────────────────────────── */}
        {SLIDES.map((slide, i) => {
          const selected = state.intents[i];
          return (
            <View
              key={slide.title}
              style={{
                width: SCREEN_WIDTH,
                flex: 1,
                paddingTop: insets.top + 60,
                paddingBottom: insets.bottom + 120,
                paddingHorizontal: 32,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: IVORY,
              }}
            >
              {/* Icon bubble */}
              <View
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: 45,
                  backgroundColor: ICON_BG,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: 28,
                }}
              >
                <Text style={{ fontSize: 38 }}>{slide.icon}</Text>
              </View>

              {/* Title */}
              <Text
                style={{
                  fontSize: 24,
                  fontWeight: '700',
                  color: colors.inkStrong,
                  letterSpacing: -0.03 * 24,
                  textAlign: 'center',
                  lineHeight: 30,
                  marginBottom: 10,
                }}
              >
                {slide.title}
              </Text>

              {/* Subtitle */}
              <Text
                style={{
                  fontSize: 15,
                  color: colors.inkSecondary,
                  lineHeight: 22,
                  textAlign: 'center',
                  maxWidth: 280,
                  marginBottom: 32,
                }}
              >
                {slide.sub}
              </Text>

              {/* Selection toggle */}
              <PressableScale
                onPress={() => toggleIntent(i)}
                scaleTo={0.97}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 999,
                  borderWidth: 1.5,
                  borderColor: selected ? colors.success : 'rgba(180,150,80,0.25)',
                  backgroundColor: selected ? colors.successTint : '#FFFFFF',
                }}
              >
                {selected ? (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      backgroundColor: colors.success,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CheckIcon size={11} />
                  </View>
                ) : (
                  <View
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 11,
                      borderWidth: 1.5,
                      borderColor: 'rgba(180,150,80,0.4)',
                    }}
                  />
                )}
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '600',
                    color: selected ? colors.successText : colors.inkSecondary,
                  }}
                >
                  {selected ? 'Added to my focus' : 'Add to my focus'}
                </Text>
              </PressableScale>
            </View>
          );
        })}

        {/* ── Final slide ───────────────────────────────────────────────── */}
        <View
          style={{
            width: SCREEN_WIDTH,
            flex: 1,
            paddingTop: insets.top + 60,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: 36,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: IVORY,
          }}
        >
          {/* Gold decorative circle */}
          <View
            style={{
              width: 90,
              height: 90,
              borderRadius: 45,
              backgroundColor: ICON_BG,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
            }}
          >
            <Text style={{ fontSize: 38 }}>✨</Text>
          </View>

          <Text
            style={{
              fontSize: 30,
              fontWeight: '700',
              color: colors.inkStrong,
              letterSpacing: -0.03 * 30,
              textAlign: 'center',
              lineHeight: 36,
              marginBottom: 10,
            }}
          >
            You're all set
          </Text>

          {/* Arabic */}
          <Text
            style={{
              fontFamily: arabicFont,
              fontSize: 22,
              color: '#5A4520',
              textAlign: 'center',
              lineHeight: 34,
              marginBottom: 12,
            }}
          >
            {'بِسْمِ اللهِ'}
          </Text>

          <Text
            style={{
              fontSize: 15,
              color: colors.inkSecondary,
              lineHeight: 22,
              textAlign: 'center',
              maxWidth: 260,
              marginBottom: 40,
            }}
          >
            Your journey begins now.
          </Text>

          <PrimaryButton
            label="Begin"
            onPress={onContinue}
            style={{ width: SCREEN_WIDTH - 72 }}
          />
        </View>
      </ScrollView>

      {/* ── Fixed bottom chrome ────────────────────────────────────────────── */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 28,
          left: 0,
          right: 0,
          paddingHorizontal: 28,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        pointerEvents="box-none"
      >
        {/* Page indicator dots */}
        <View style={{ flexDirection: 'row', gap: 7, alignItems: 'center' }}>
          {Array.from({ length: TOTAL_PAGES }).map((_, i) => (
            <TouchableOpacity
              key={i}
              onPress={() => goToPage(i)}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <View
                style={{
                  width: i === activePage ? 20 : 7,
                  height: 7,
                  borderRadius: 999,
                  backgroundColor:
                    i === activePage ? GOLD : 'rgba(0,0,0,0.15)',
                }}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Next button — hidden on final slide */}
        {activePage < FINAL_PAGE ? (
          <PressableScale
            onPress={onNext}
            scaleTo={0.95}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              paddingVertical: 10,
              paddingHorizontal: 18,
              borderRadius: 999,
              backgroundColor: colors.primary,
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: '600',
                color: '#FFFFFF',
                letterSpacing: 0.01,
              }}
            >
              Next
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 13 }}>→</Text>
          </PressableScale>
        ) : (
          // Invisible spacer so dots stay left-aligned on the final slide
          <View style={{ width: 80 }} />
        )}
      </View>
    </ScreenFade>
  );
}
