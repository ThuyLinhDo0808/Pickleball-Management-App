import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from '../services/api';
import { useLoad } from '../hooks/useLoad';
import { colors } from '../theme';
import { T, Card } from './ui';

// "Free plan - 12 / 30 used". Tap to open the plans screen.
export default function CapacityBanner() {
  const navigation = useNavigation();
  const { data } = useLoad(() => api.get('/api/host/me'), []);
  const sub = data?.subscription;
  if (!sub) return null;

  const pct = Math.min(100, Math.round((sub.current_usage / Math.max(1, sub.max_capacity)) * 100));
  const bar = pct >= 100 ? colors.danger : pct >= 80 ? colors.warn : colors.primary;
  const tier = sub.tier.charAt(0).toUpperCase() + sub.tier.slice(1);

  return (
    <Card onPress={() => navigation.navigate('Plan')} style={{ paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
        <T bold>{tier} plan</T>
        <T muted>{sub.current_usage} / {sub.max_capacity} used</T>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: 6, backgroundColor: bar }} />
      </View>
      {pct >= 80 ? (
        <T size={12} style={{ color: bar, marginTop: 8 }}>
          {pct >= 100 ? 'Limit reached - tap to upgrade.' : 'Nearly full - tap to see plans.'}
        </T>
      ) : null}
    </Card>
  );
}
