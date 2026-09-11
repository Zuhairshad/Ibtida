import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Modal,
  PanResponder,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchDailyInsight, type DailyInsight } from '../services/insights';
import { colors } from '../theme/tokens';
import ProgressRing from './ProgressRing';
import StreakDotRow from './StreakDotRow';

const { width: SW, height: SH } = Dimensions.get('window');
const SHEET_H = Math.min(SH * 0.82, 680);
const CARD_W = SW - 48;
const CARD_H = SHEET_H * 0.56;
const DISMISS_THRESHOLD = 72;

// ── Palette ───────────────────────────────────────────────────────────────────
const GOLD       = '#D4A853';
const GOLD_LIGHT = '#EDD48A';
const GOLD_DIM   = '#A07830';
const BG_DEEP    = '#040C18';
const ARABIC     = 'ScheherazadeNew_700Bold';

// 8-pointed Islamic star path (same as HomeScreen hero)
function star8Path(cx: number, cy: number, R: number, r: number) {
  let d = '';
  for (let i = 0; i < 16; i++) {
    const a = (i * Math.PI) / 8 - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    d += `${i === 0 ? 'M' : 'L'}${(cx + rad * Math.cos(a)).toFixed(2)},${(cy + rad * Math.sin(a)).toFixed(2)} `;
  }
  return d + 'Z';
}

// Glassmorphism card wrapper
function GlassCard({
  children, accentColor = GOLD, style,
}: {
  children: React.ReactNode;
  accentColor?: string;
  style?: object;
}) {
  return (
    <View style={[{ width: CARD_W, height: CARD_H, borderRadius: 28, overflow: 'hidden' }, style]}>
      {/* Frosted base */}
      {Platform.OS === 'ios' ? (
        <BlurView intensity={14} tint="dark" style={StyleSheet.absoluteFill} />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(8,20,42,0.85)' }]} />
      )}
      {/* Accent glow orb top-right */}
      <View style={{
        position: 'absolute', top: -40, right: -40,
        width: 160, height: 160, borderRadius: 80,
        backgroundColor: accentColor, opacity: 0.12,
      }} />
      {/* Bottom-left orb */}
      <View style={{
        position: 'absolute', bottom: -30, left: -30,
        width: 100, height: 100, borderRadius: 50,
        backgroundColor: accentColor, opacity: 0.07,
      }} />
      {/* Glass border */}
      <View style={[StyleSheet.absoluteFill, {
        borderRadius: 28,
        borderWidth: 1,
        borderColor: `${accentColor}28`,
      }]} />
      {/* Content */}
      <View style={{ flex: 1, padding: 24 }}>
        {children}
      </View>
    </View>
  );
}

// Overline label
function Label({ text, color = 'rgba(255,255,255,0.38)' }: { text: string; color?: string }) {
  return (
    <Text style={{ fontSize: 10, fontWeight: '700', color, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 4 }}>
      {text}
    </Text>
  );
}

// Divider
function Divider({ opacity = 0.1 }: { opacity?: number }) {
  return <View style={{ height: 1, backgroundColor: `rgba(255,255,255,${opacity})`, marginVertical: 14 }} />;
}

// ─── Card 1: Prayers ──────────────────────────────────────────────────────────
const PRAYER_META: Record<string, { arabic: string; icon: string }> = {
  Fajr:    { arabic: 'الفجر',   icon: '🌅' },
  Dhuhr:   { arabic: 'الظهر',   icon: '🌞' },
  Asr:     { arabic: 'العصر',   icon: '🌤' },
  Maghrib: { arabic: 'المغرب',  icon: '🌇' },
  Isha:    { arabic: 'العشاء',  icon: '🌙' },
};

function PrayerCard({ insight }: { insight: DailyInsight }) {
  const pct = insight.todayPrayed / insight.todayTotal;
  const ringAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ringAnim, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, []);

  return (
    <GlassCard accentColor="#4A8FD4">
      <Label text="Today's Salah" color="rgba(120,180,255,0.6)" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, marginTop: 10 }}>
        {/* Animated ring */}
        <View style={{ alignItems: 'center' }}>
          <ProgressRing
            size={88}
            strokeWidth={7}
            progress={pct}
            color={GOLD}
            trackColor="rgba(255,255,255,0.08)"
          >
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#FFFFFF' }}>
              {insight.todayPrayed}
            </Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: -2 }}>
              of 5
            </Text>
          </ProgressRing>
          {insight.todayPrayed === 5 && (
            <Text style={{ fontSize: 18, marginTop: 6 }}>🌟</Text>
          )}
        </View>

        {/* Prayer rows */}
        <View style={{ flex: 1, gap: 9 }}>
          {(['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const).map((p) => {
            const done = insight.prayedNames.includes(p);
            const meta = PRAYER_META[p];
            return (
              <View key={p} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  backgroundColor: done ? `${GOLD}20` : 'rgba(255,255,255,0.06)',
                  borderWidth: 1,
                  borderColor: done ? `${GOLD}50` : 'rgba(255,255,255,0.1)',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: done ? 11 : 10 }}>{done ? '✓' : meta.icon}</Text>
                </View>
                <Text style={{
                  fontSize: 13.5, fontWeight: done ? '700' : '400',
                  color: done ? '#FFFFFF' : 'rgba(255,255,255,0.35)',
                  flex: 1,
                }}>
                  {p}
                </Text>
                <Text style={{ fontFamily: ARABIC, fontSize: 12, color: done ? GOLD_LIGHT : 'rgba(255,255,255,0.2)' }}>
                  {meta.arabic}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Footer status */}
      <View style={{
        marginTop: 'auto', paddingTop: 10,
        backgroundColor: insight.todayPrayed === 5
          ? `${GOLD}14` : 'rgba(255,255,255,0.04)',
        borderRadius: 14, padding: 11,
        borderWidth: 1,
        borderColor: insight.todayPrayed === 5 ? `${GOLD}30` : 'rgba(255,255,255,0.07)',
      }}>
        <Text style={{ fontSize: 12.5, fontWeight: '600', textAlign: 'center',
          color: insight.todayPrayed === 5 ? GOLD_LIGHT : 'rgba(255,255,255,0.45)',
        }}>
          {insight.todayPrayed === 5
            ? 'Alhamdulillah — all five prayers complete 🌟'
            : `${5 - insight.todayPrayed} prayer${5 - insight.todayPrayed > 1 ? 's' : ''} remaining — keep going`}
        </Text>
      </View>
    </GlassCard>
  );
}

// ─── Card 2: Streak ───────────────────────────────────────────────────────────
function StreakCard({ insight }: { insight: DailyInsight }) {
  const numAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(numAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, []);

  return (
    <GlassCard accentColor={GOLD}>
      <Label text="Prayer Streak" color={`${GOLD}99`} />

      {/* Big streak number */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
        <Text style={{ fontSize: 72, fontWeight: '900', color: GOLD, letterSpacing: -3, lineHeight: 74 }}>
          {insight.streak}
        </Text>
        <View style={{ paddingBottom: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>days</Text>
          <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>
            best: {insight.personalBest}
          </Text>
        </View>
        {insight.streak > 0 && (
          <Text style={{ fontSize: 32, paddingBottom: 12 }}>🔥</Text>
        )}
      </View>

      <Divider opacity={0.08} />

      {/* 7-day row */}
      <View style={{ marginBottom: 12 }}>
        <StreakDotRow days={insight.streakDays} dotSize={15} />
      </View>

      {/* Milestones */}
      {insight.milestones.length > 0 && (
        <View style={{ gap: 7 }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color: GOLD_DIM, letterSpacing: 1.2, textTransform: 'uppercase' }}>
            Milestones
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {insight.milestones.map((m) => (
              <View key={m} style={{
                paddingHorizontal: 12, paddingVertical: 7,
                backgroundColor: `${GOLD}18`, borderRadius: 20,
                borderWidth: 1, borderColor: `${GOLD}35`,
              }}>
                <Text style={{ fontSize: 12, color: GOLD_LIGHT, fontWeight: '700' }}>{m}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
      {insight.streak === 0 && (
        <View style={{
          backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, padding: 12,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', marginTop: 6,
        }}>
          <Text style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 19 }}>
            Every journey starts with one prayer.{'\n'}Log today's to begin your streak.
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

// ─── Card 3: Goals ────────────────────────────────────────────────────────────
const EMERALD = '#4CAF82';

function GoalBar({ pct }: { pct: number }) {
  const fillAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fillAnim, { toValue: pct / 100, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [pct]);
  const w = fillAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
  return (
    <View style={{ height: 7, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginTop: 6 }}>
      <Animated.View style={{ height: '100%', width: w, borderRadius: 4, backgroundColor: EMERALD }} />
    </View>
  );
}

function GoalsCard({ insight }: { insight: DailyInsight }) {
  return (
    <GlassCard accentColor={EMERALD}>
      <Label text="Active Goals" color={`${EMERALD}99`} />
      {insight.activeGoals.length > 0 ? (
        <View style={{ flex: 1, gap: 14, marginTop: 10 }}>
          {insight.activeGoals.map((g) => (
            <View key={g.id} style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 14, padding: 13,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13.5, fontWeight: '700', color: '#FFF', flex: 1 }} numberOfLines={1}>
                  {g.title}
                </Text>
                <Text style={{ fontSize: 14, fontWeight: '800', color: EMERALD, marginLeft: 10 }}>
                  {g.pct}%
                </Text>
              </View>
              <GoalBar pct={g.pct} />
              {g.communityLinked && (
                <View style={{ marginTop: 7, flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: GOLD }} />
                  <Text style={{ fontSize: 10, color: GOLD_DIM, fontWeight: '600' }}>
                    Community goal
                  </Text>
                </View>
              )}
            </View>
          ))}
          {insight.completedToday > 0 && (
            <View style={{
              backgroundColor: `${EMERALD}14`, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 9,
              borderWidth: 1, borderColor: `${EMERALD}30`, flexDirection: 'row', alignItems: 'center', gap: 8,
            }}>
              <Text style={{ fontSize: 16 }}>✅</Text>
              <Text style={{ fontSize: 13, color: EMERALD, fontWeight: '700' }}>
                {insight.completedToday} completed today
              </Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
          <Text style={{ fontSize: 44 }}>📿</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.6)' }}>No active goals</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.35)', textAlign: 'center', lineHeight: 19 }}>
            Create a dhikr goal to track your{'\n'}daily remembrance of Allah.
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

// ─── Card 4: Dawah Network ────────────────────────────────────────────────────
const TEAL = '#38C6A8';

function DawahCard({ insight }: { insight: DailyInsight }) {
  return (
    <GlassCard accentColor={TEAL}>
      <Label text="Dawah Network" color={`${TEAL}99`} />

      {/* Stats row */}
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
        <View style={{
          flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 16,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', gap: 3,
        }}>
          <Text style={{ fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 }}>
            {insight.circles.length}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Circles
          </Text>
        </View>
        <View style={{
          flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 18, padding: 16,
          borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', gap: 3,
        }}>
          <Text style={{ fontSize: 34, fontWeight: '900', color: '#FFFFFF', letterSpacing: -1 }}>
            {insight.totalNetworkMembers}
          </Text>
          <Text style={{ fontSize: 10, fontWeight: '700', color: TEAL, letterSpacing: 0.8, textTransform: 'uppercase' }}>
            Members
          </Text>
        </View>
      </View>

      {/* Circle list */}
      {insight.circles.length > 0 ? (
        <View style={{ marginTop: 14, gap: 9 }}>
          {insight.circles.map((c) => (
            <View key={c.id} style={{
              backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 14,
              borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFF' }}>{c.name}</Text>
                <View style={{
                  backgroundColor: `${TEAL}18`, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4,
                  borderWidth: 1, borderColor: `${TEAL}35`,
                }}>
                  <Text style={{ fontSize: 11, color: TEAL, fontWeight: '700' }}>{c.memberCount} members</Text>
                </View>
              </View>
              {c.inviteCode && (
                <View style={{
                  marginTop: 9,
                  backgroundColor: `${GOLD}10`, borderRadius: 10,
                  paddingHorizontal: 12, paddingVertical: 8,
                  borderWidth: 1, borderColor: `${GOLD}28`,
                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <Text style={{ fontSize: 9.5, color: `${GOLD}80`, fontWeight: '600', letterSpacing: 0.5 }}>
                    INVITE CODE
                  </Text>
                  <Text style={{ fontSize: 14, color: GOLD_LIGHT, fontWeight: '800', letterSpacing: 3 }}>
                    {c.inviteCode}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 10 }}>
          <Text style={{ fontSize: 40 }}>🕌</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 19 }}>
            Create a circle and invite your family.{'\n'}You earn sadaqah for every prayer they make.
          </Text>
        </View>
      )}
    </GlassCard>
  );
}

// ─── Card 5: Community Impact ─────────────────────────────────────────────────
const VIOLET = '#8B6CF7';

function CommunityCard({ insight }: { insight: DailyInsight }) {
  const totalFormatted = insight.communityDhikrTotal >= 1_000_000
    ? `${(insight.communityDhikrTotal / 1_000_000).toFixed(1)}M`
    : insight.communityDhikrTotal >= 1000
    ? `${(insight.communityDhikrTotal / 1000).toFixed(1)}K`
    : insight.communityDhikrTotal.toLocaleString();

  const contribPct = insight.communityDhikrTotal > 0
    ? Math.min(100, Math.round((insight.myContributions / insight.communityDhikrTotal) * 100))
    : 0;

  return (
    <GlassCard accentColor={VIOLET}>
      <Label text="Community Impact" color={`${VIOLET}99`} />

      {/* Hero number */}
      <View style={{
        alignItems: 'center', marginTop: 8,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 22, padding: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
      }}>
        <Text style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
          Total Recitations
        </Text>
        <Text style={{ fontSize: 52, fontWeight: '900', color: '#FFFFFF', letterSpacing: -2, lineHeight: 54 }}>
          {totalFormatted}
        </Text>
        <Text style={{ fontSize: 11.5, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>
          across {insight.communityGoalCount} goal{insight.communityGoalCount !== 1 ? 's' : ''}
        </Text>
      </View>

      <Divider opacity={0.07} />

      {/* My contribution */}
      <View style={{
        backgroundColor: `${GOLD}10`, borderRadius: 18, padding: 16,
        borderWidth: 1, borderColor: `${GOLD}25`,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <View>
          <Text style={{ fontSize: 10, fontWeight: '700', color: GOLD_DIM, letterSpacing: 1, textTransform: 'uppercase' }}>
            Your Share
          </Text>
          <Text style={{ fontSize: 28, fontWeight: '900', color: GOLD_LIGHT, letterSpacing: -1, marginTop: 2 }}>
            {insight.myContributions.toLocaleString()}
          </Text>
          <Text style={{ fontSize: 11, color: `${GOLD}60`, marginTop: 1 }}>recitations by you</Text>
        </View>
        <View style={{
          width: 58, height: 58, borderRadius: 29,
          backgroundColor: `${GOLD}18`, borderWidth: 2, borderColor: `${GOLD}35`,
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: GOLD }}>{contribPct}%</Text>
        </View>
      </View>
    </GlassCard>
  );
}

// ─── Card 6: Wisdom ───────────────────────────────────────────────────────────
function WisdomCard() {
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const glowOp = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.22] });

  return (
    <GlassCard accentColor={GOLD} style={{ height: CARD_H }}>
      <Label text="Today's Wisdom" color={`${GOLD_DIM}CC`} />

      {/* Pulsing glow behind Arabic */}
      <Animated.View style={{
        position: 'absolute', top: CARD_H * 0.18, alignSelf: 'center',
        width: 200, height: 200, borderRadius: 100,
        backgroundColor: GOLD, opacity: glowOp,
      }} />

      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 0, paddingHorizontal: 4 }}>
        {/* Ornament */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}30` }} />
          <Text style={{ color: GOLD, fontSize: 11 }}>✦</Text>
          <Text style={{ color: GOLD_DIM, fontSize: 9 }}>☽</Text>
          <Text style={{ color: GOLD, fontSize: 11 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}30` }} />
        </View>

        <Text style={{
          fontFamily: ARABIC, fontSize: 30, color: GOLD_LIGHT,
          textAlign: 'center', lineHeight: 46, writingDirection: 'rtl',
        }}>
          أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ
        </Text>

        <View style={{ width: 36, height: 1.5, backgroundColor: `${GOLD}60`, marginVertical: 14 }} />

        <Text style={{
          fontSize: 15, color: 'rgba(255,255,255,0.82)',
          textAlign: 'center', lineHeight: 23, fontStyle: 'italic',
        }}>
          "Verily, in the remembrance of Allah{'\n'}do hearts find rest."
        </Text>
        <Text style={{ fontSize: 11.5, color: `${GOLD}70`, marginTop: 8, fontWeight: '600' }}>
          — Quran 13:28
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}20` }} />
          <Text style={{ color: GOLD_DIM, fontSize: 9 }}>✦</Text>
          <View style={{ flex: 1, height: 1, backgroundColor: `${GOLD}20` }} />
        </View>
      </View>

      {/* Bottom callout */}
      <View style={{
        backgroundColor: `${GOLD}10`, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: `${GOLD}22`,
      }}>
        <Text style={{ fontSize: 12, color: GOLD_DIM, textAlign: 'center', lineHeight: 18 }}>
          Every unlock is a chance to remember Allah. Open for dhikr ☽
        </Text>
      </View>
    </GlassCard>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.04, 0.12] });
  return (
    <View style={{ width: CARD_W, height: CARD_H, borderRadius: 28, overflow: 'hidden',
      backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
      alignItems: 'center', justifyContent: 'center', gap: 12,
    }}>
      {[80, 120, 60, 100, 70].map((w, i) => (
        <Animated.View key={i} style={{ width: `${w}%`, height: 12, borderRadius: 6, backgroundColor: 'rgba(255,255,255,1)', opacity }} />
      ))}
    </View>
  );
}

// ─── Animated dot indicator ───────────────────────────────────────────────────
function DotRow({ count, active, onPress }: { count: number; active: number; onPress: (i: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 7, marginTop: 14 }}>
      {Array.from({ length: count }).map((_, i) => (
        <TouchableOpacity key={i} onPress={() => onPress(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
          <View style={{
            height: 6, borderRadius: 3,
            width: i === active ? 22 : 6,
            backgroundColor: i === active ? GOLD : 'rgba(255,255,255,0.22)',
          }} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Sheet ────────────────────────────────────────────────────────────────────
type Props = { userId: string; displayName: string };

const CARD_COUNT = 6;
const CARD_ICONS = ['🕌', '🔥', '📿', '🌍', '✨', '💫'];
const CARD_TITLES = ['Prayers', 'Streak', 'Goals', 'Network', 'Community', 'Wisdom'];

// Geometric star positions for sheet background
const GEO_PTS: Array<{ x: number; y: number }> = [];
const S = 38;
for (let row = 0; row <= Math.ceil(SHEET_H / S) + 1; row++) {
  for (let col = -1; col <= Math.ceil(SW / S) + 1; col++) {
    GEO_PTS.push({ x: col * S + (row % 2 === 0 ? 0 : S / 2), y: row * S });
  }
}

export default function DailyInsightSheet({ userId, displayName }: Props) {
  const [visible, setVisible] = useState(false);
  const [insight, setInsight] = useState<DailyInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [cardIndex, setCardIndex] = useState(0);

  const translateY = useRef(new Animated.Value(SHEET_H)).current;
  const backdropOp  = useRef(new Animated.Value(0)).current;
  const glowAnim    = useRef(new Animated.Value(0)).current;
  const cardScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const key = `insight_shown_${new Date().toISOString().slice(0, 10)}`;
      const already = await AsyncStorage.getItem(key);
      if (already || cancelled) return;
      await AsyncStorage.setItem(key, '1');
      if (cancelled) return;
      setLoading(true);
      setVisible(true);
      try {
        const data = await fetchDailyInsight(userId);
        if (!cancelled) setInsight(data);
      } catch { /* non-fatal */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 24, stiffness: 200, mass: 0.9 }),
      Animated.timing(backdropOp, { toValue: 1, duration: 260, useNativeDriver: true }),
    ]).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, [visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: SHEET_H, duration: 300, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(backdropOp, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setVisible(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => g.dy > 6 && Math.abs(g.dy) > Math.abs(g.dx) * 1.5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > DISMISS_THRESHOLD || g.vy > 1.2) {
          dismiss();
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 220 }).start();
        }
      },
    })
  ).current;

  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
  const glowOp1   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.26] });
  const glowOp2   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.18] });

  const scrollToCard = (i: number) => {
    setCardIndex(i);
    cardScrollRef.current?.scrollTo({ x: i * CARD_W, animated: true });
  };

  if (!visible) return null;

  const D = insight ?? EMPTY_INSIGHT;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={dismiss} statusBarTranslucent>

      {/* ── Backdrop ─────────────────────────────────────────────── */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOp }]}>
        {Platform.OS === 'ios'
          ? <BlurView intensity={22} tint="dark" style={StyleSheet.absoluteFill} />
          : <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(4,12,26,0.72)' }]} />}
      </Animated.View>

      {/* Tap backdrop to dismiss */}
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: backdropOp }]}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={dismiss} />
      </Animated.View>

      {/* ── Sheet ────────────────────────────────────────────────── */}
      <Animated.View style={[S_.sheet, { transform: [{ translateY }] }]} {...panResponder.panHandlers}>

        {/* Sheet background: deep navy + geometric lattice */}
        <View style={StyleSheet.absoluteFill}>
          <LinearGradient
            colors={[BG_DEEP, '#081428', '#050E1E']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          {/* Islamic geometric star pattern */}
          <Svg style={[StyleSheet.absoluteFill, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]} opacity={0.06}>
            {GEO_PTS.map((pt, i) => (
              <Path key={i} d={star8Path(pt.x, pt.y, 8, 3.5)} fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="0.5" />
            ))}
          </Svg>
        </View>

        {/* Ambient glow orbs inside sheet */}
        <Animated.View style={{
          position: 'absolute', top: -60, right: -60,
          width: 240, height: 240, borderRadius: 120,
          backgroundColor: '#1E4FA0',
          opacity: glowOp1, transform: [{ scale: glowScale }],
        }} />
        <Animated.View style={{
          position: 'absolute', bottom: 80, left: -80,
          width: 200, height: 200, borderRadius: 100,
          backgroundColor: GOLD,
          opacity: glowOp2, transform: [{ scale: glowScale }],
        }} />

        {/* Top border accent line */}
        <LinearGradient
          colors={['transparent', `${GOLD}50`, 'transparent']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={{ position: 'absolute', top: 0, left: 40, right: 40, height: 1 }}
        />

        {/* ── Handle ─────────────────────────────────────────────── */}
        <View style={S_.handle} />

        {/* ── Header ─────────────────────────────────────────────── */}
        <View style={{ paddingHorizontal: 24, marginBottom: 18 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: ARABIC, fontSize: 13, color: GOLD, letterSpacing: 0.5 }}>
                بِسْمِ اللَّهِ
              </Text>
              <Text style={{ fontSize: 9.5, fontWeight: '700', color: 'rgba(255,255,255,0.35)', letterSpacing: 1.4, textTransform: 'uppercase', marginTop: 4 }}>
                Daily Insight
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: '#FFFFFF', marginTop: 2, letterSpacing: -0.3 }} numberOfLines={1}>
                {displayName ? `Assalam-o-Alaikum, ${displayName}` : 'Assalam-o-Alaikum'}
              </Text>
            </View>

            {/* Close button */}
            <TouchableOpacity onPress={dismiss} style={S_.closeBtn}>
              <View style={S_.closeBtnInner}>
                <Text style={{ fontSize: 14, color: 'rgba(255,255,255,0.55)', fontWeight: '600' }}>✕</Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Card mini-tab strip */}
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={{ marginTop: 14 }}
            contentContainerStyle={{ gap: 7 }}
          >
            {CARD_TITLES.map((t, i) => (
              <TouchableOpacity key={t} onPress={() => scrollToCard(i)}>
                <View style={[S_.tab, i === cardIndex && S_.tabActive]}>
                  <Text style={{ fontSize: 14, marginRight: 4 }}>{CARD_ICONS[i]}</Text>
                  <Text style={[S_.tabText, i === cardIndex && S_.tabTextActive]}>{t}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ── Cards ──────────────────────────────────────────────── */}
        <View style={{ paddingLeft: 24 }}>
          {loading && !insight ? (
            <SkeletonCard />
          ) : (
            <ScrollView
              ref={cardScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              decelerationRate="fast"
              snapToInterval={CARD_W}
              onMomentumScrollEnd={(e) => {
                setCardIndex(Math.round(e.nativeEvent.contentOffset.x / CARD_W));
              }}
              contentContainerStyle={{ gap: 0 }}
            >
              <PrayerCard    insight={D} />
              <StreakCard    insight={D} />
              <GoalsCard     insight={D} />
              <DawahCard     insight={D} />
              <CommunityCard insight={D} />
              <WisdomCard />
            </ScrollView>
          )}
        </View>

        {/* ── Dot indicators ──────────────────────────────────────── */}
        <DotRow count={CARD_COUNT} active={cardIndex} onPress={scrollToCard} />

      </Animated.View>
    </Modal>
  );
}

// ─── Empty fallback ───────────────────────────────────────────────────────────
const EMPTY_INSIGHT: DailyInsight = {
  displayName: '',
  streak: 0, personalBest: 0,
  streakDays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label) => ({ label, hit: false })),
  todayPrayed: 0, todayTotal: 5, prayedNames: [],
  activeGoals: [], completedToday: 0,
  circles: [], totalNetworkMembers: 0,
  communityDhikrTotal: 0, communityGoalCount: 0, myContributions: 0,
  milestones: [],
};

// ─── Styles ───────────────────────────────────────────────────────────────────
// Named S_ to avoid collision with the RN import 'StyleSheet'
const S_ = StyleSheet.create({
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: SHEET_H,
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    overflow: 'hidden',
    paddingTop: 12, paddingBottom: 28,
    shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 50,
    shadowOffset: { width: 0, height: -16 }, elevation: 24,
  },
  handle: {
    width: 44, height: 5, borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignSelf: 'center', marginBottom: 14,
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnInner: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  tab: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  tabActive: {
    backgroundColor: `${GOLD}18`,
    borderColor: `${GOLD}40`,
  },
  tabText: {
    fontSize: 12, fontWeight: '600',
    color: 'rgba(255,255,255,0.45)',
  },
  tabTextActive: {
    color: GOLD_LIGHT,
  },
});
