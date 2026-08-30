import React from 'react';
import { Text, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { RootStackParamList } from '../../navigation/types';
import { useAppState } from '../../state/AppState';
import { nav } from '../../navigation/navigate';
import { colors } from '../../theme/tokens';
import BottomSheetModal from '../../components/BottomSheetModal';
import PressableScale from '../../components/PressableScale';
import PrimaryButton from '../../components/PrimaryButton';
import SecondaryButton from '../../components/SecondaryButton';

type Props = NativeStackScreenProps<RootStackParamList, 'PrayerDetail'>;

const LOG_MODES = ['Missed', 'On time', "In jama’ah"];

export default function PrayerDetailScreen({ route }: Props) {
  const { prayerName } = route.params;
  const { state, setLogMode, markAsr } = useAppState();

  const onMark = () => {
    markAsr();
    nav.back();
  };

  return (
    <BottomSheetModal visible onClose={nav.back}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <View>
          <Text style={{ fontSize: 24, fontWeight: '600', color: colors.inkStrong, letterSpacing: -0.02 }}>{prayerName}</Text>
          <Text style={{ fontSize: 14, color: colors.inkMuted, marginTop: 8 }}>3:40 PM · ends 6:33 PM</Text>
        </View>
        <View style={{ backgroundColor: colors.primaryTint, paddingVertical: 8, paddingHorizontal: 11, borderRadius: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '500', color: '#1F3E63' }}>Current</Text>
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginTop: 20 }}>
        {LOG_MODES.map((label, i) => {
          const on = state.logMode === i;
          return (
            <PressableScale
              key={label}
              scaleTo={1}
              onPress={() => setLogMode(i)}
              style={{
                flex: 1,
                minHeight: 48,
                borderRadius: 14,
                backgroundColor: on ? colors.primary : '#FFFFFF',
                borderWidth: on ? 0 : 1,
                borderColor: 'rgba(23,32,28,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 13.5, fontWeight: on ? '600' : '500', color: on ? '#FFFFFF' : colors.inkMuted }}>{label}</Text>
            </PressableScale>
          );
        })}
      </View>

      <View style={{ marginTop: 10, borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, backgroundColor: '#FFFFFF', padding: 16 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', letterSpacing: 0.09, textTransform: 'uppercase', color: colors.inkSecondary }}>Optional note</Text>
        <Text style={{ fontSize: 14, lineHeight: 21, color: colors.inkSecondary, marginTop: 10 }}>Prayed at the masjid with Yusuf's father.</Text>
      </View>

      <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: colors.cardBorder, borderRadius: 20, backgroundColor: '#FFFFFF', paddingVertical: 15, paddingHorizontal: 16 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: colors.inkStrong }}>Adhan notification</Text>
        <View style={{ width: 48, height: 29, borderRadius: 15, backgroundColor: colors.success }}>
          <View style={{ position: 'absolute', top: 2.5, right: 2.5, width: 24, height: 24, borderRadius: 12, backgroundColor: '#fff' }} />
        </View>
      </View>

      <PrimaryButton label="Mark as prayed" onPress={onMark} style={{ marginTop: 16 }} />
      <SecondaryButton label="Cancel" onPress={nav.back} style={{ marginTop: 2 }} />
    </BottomSheetModal>
  );
}
