import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { useLoad } from '../hooks/useLoad';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { T, Card, ProgressBar } from './ui';

// "Gói Free · 12 / 30" - tap to open the plans screen.
export default function CapacityBanner() {
  const navigation = useNavigation();
  const { t } = useI18n();
  const { data } = useLoad(() => api.get('/api/host/me'), []);
  const sub = data?.subscription;
  if (!sub) return null;

  const pct = Math.min(100, Math.round((sub.current_usage / Math.max(1, sub.max_capacity)) * 100));
  const bar = pct >= 100 ? colors.danger : pct >= 80 ? colors.warn : colors.accent;

  return (
    <Card onPress={() => navigation.navigate('Plan')} style={{ paddingVertical: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="ribbon-outline" size={16} color={colors.accent} />
          <T bold>{t('plan.name', { tier: t(`tier.${sub.tier}`) })}</T>
        </View>
        <T muted>{t('plan.usage', { used: sub.current_usage, max: sub.max_capacity })}</T>
      </View>
      <ProgressBar value={sub.current_usage} max={sub.max_capacity} color={bar} />
      {pct >= 80 ? (
        <T size={12} style={{ color: bar, marginTop: 8 }}>
          {pct >= 100 ? t('plan.full') : t('plan.nearlyFull')}
        </T>
      ) : null}
    </Card>
  );
}
