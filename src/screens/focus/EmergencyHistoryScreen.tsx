import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../state/AuthContext';
import { getOverrideHistory, countOverridesSince, type EmergencyOverrideEntry } from '../../services/ibadahLock';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import { ScreenFade } from '../../components/ScreenFade';
import PressableScale from '../../components/PressableScale';
import EmptyState from '../../components/EmptyState';
import { RowSkeleton } from '../../components/Skeleton';
import { ChevronLeftIcon, WarningIcon } from '../../theme/icons';

type LoadState = 'loading' | 'error' | 'ready';

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

// Own-eyes-only log of past Ibadah Lock "emergency unlock" uses — see
// src/services/ibadahLock.ts's getOverrideHistory/countOverridesSince.
// Reachable only from the signed-in user's own Profile tab; nothing here is
// ever queryable cross-user (matches emergency_overrides' RLS).
export default function EmergencyHistoryScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [entries, setEntries] = useState<EmergencyOverrideEntry[]>([]);
  const [weekCount, setWeekCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const sinceISO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    Promise.all([getOverrideHistory(user.id), countOverridesSince(user.id, sinceISO)])
      .then(([history, count]) => {
        if (!active) return;
        setEntries(history);
        setWeekCount(count);
        setError(false);
      })
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [user, reloadKey]);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    setReloadKey((k) => k + 1);
  }, []);
  const loadState: LoadState = loading ? 'loading' : error ? 'error' : 'ready';

  return (
    <ScreenFade duration={300} style={{ backgroundColor: colors.bg, paddingTop: insets.top + 12 }}>
      <View style={{ paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <PressableScale onPress={nav.back} scaleTo={1} style={{ minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', marginLeft: -10 }}>
          <ChevronLeftIcon color={colors.inkMuted} />
        </PressableScale>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.inkStrong }}>Emergency unlock history</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 14, paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
        <Text style={{ fontSize: 13.5, lineHeight: 20.5, color: colors.inkMuted }}>
          Visible only to you. Every time you use the emergency unlock during an Ibadah Lock session, it’s recorded here — never shown to anyone else.
        </Text>

        {loadState === 'loading' ? (
          <View style={{ marginTop: 22 }}>
            <RowSkeleton rows={4} />
          </View>
        ) : loadState === 'error' ? (
          <View style={{ marginTop: 22 }}>
            <EmptyState
              icon={<WarningIcon size={22} color={colors.inkMuted} />}
              title="Couldn’t load your history"
              subtitle="Check your connection and try again."
              actionLabel="Retry"
              onAction={load}
            />
          </View>
        ) : entries.length === 0 ? (
          <View style={{ marginTop: 22 }}>
            <EmptyState
              icon={<WarningIcon size={22} color={colors.inkMuted} />}
              title="No emergency unlocks yet"
              subtitle="You haven’t needed the safety valve. It’s there whenever you do."
            />
          </View>
        ) : (
          <>
            <View style={{ marginTop: 18, borderRadius: 20, padding: 18, backgroundColor: colors.bgTint, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 13.5, fontWeight: '500', color: colors.inkStrong }}>This week</Text>
              <Text style={{ fontSize: 15, fontWeight: '600', color: colors.inkStrong }}>{weekCount} time{weekCount === 1 ? '' : 's'}</Text>
            </View>

            <View style={{ marginTop: 14, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 24, backgroundColor: '#FFFFFF', overflow: 'hidden' }}>
              {entries.map((entry, i) => (
                <View
                  key={entry.id}
                  style={{
                    padding: 18,
                    borderBottomWidth: i === entries.length - 1 ? 0 : 1,
                    borderColor: colors.divider,
                    minHeight: 52,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                  }}
                >
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={{ fontSize: 14.5, fontWeight: '500', color: colors.inkStrong }}>{formatEntryDate(entry.usedAt)}</Text>
                    {!!entry.reason && (
                      <Text style={{ fontSize: 12.5, color: colors.inkMuted, marginTop: 4 }} numberOfLines={2}>
                        {entry.reason}
                      </Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </ScreenFade>
  );
}
