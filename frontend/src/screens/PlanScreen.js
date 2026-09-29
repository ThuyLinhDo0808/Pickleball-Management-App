import React, { useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { api } from '../services/api';
import { useLoad } from '../hooks/useLoad';
import { showError } from '../utils/errors';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { toast } from '../components/Toast';
import { T, Card, Button, Chip, ErrorState, Loading, ProgressBar } from '../components/ui';

const TIERS = [
  { tier: 'free', cap: 30 },
  { tier: 'basic', cap: 100 },
  { tier: 'standard', cap: 300 },
  { tier: 'pro', cap: 1000 },
];

export default function PlanScreen({ navigation }) {
  const { t } = useI18n();
  const { data, error, loading, reload, retry } = useLoad(() => api.get('/api/host/me'), []);
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const sub = data.subscription;

  function choose(item) {
    const over = sub.current_usage > item.cap;
    const name = t(`tier.${item.tier}`);
    Alert.alert(
      t('plan.switchTitle', { name }),
      t('plan.switchBody', { cap: item.cap }) + (over ? `\n\n${t('plan.overLimit', { used: sub.current_usage, cap: item.cap })}` : ''),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('plan.switch'),
          onPress: async () => {
            try {
              setBusy(item.tier);
              await api.post('/api/host/subscription', { tier: item.tier });
              toast(t('plan.switched', { name }));
              reload();
            } catch (e) {
              showError(t('plan.switchFailed'), e, navigation);
            } finally {
              setBusy(null);
            }
          },
        },
      ]
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <T muted size={12} bold>{t('plan.currentUsage')}</T>
        <T bold size={30} style={{ marginVertical: 4 }}>{sub.current_usage} / {sub.max_capacity}</T>
        <ProgressBar value={sub.current_usage} max={sub.max_capacity} />
        <T muted size={12} style={{ marginTop: 10 }}>{t('plan.usageExplain')}</T>
      </Card>

      {TIERS.map((item) => {
        const current = item.tier === sub.tier;
        return (
          <Card key={item.tier} style={current ? { borderColor: colors.accent } : null}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <T bold size={18}>{t(`tier.${item.tier}`)}</T>
                <T muted size={13} style={{ marginTop: 2 }}>{t('plan.upTo', { cap: item.cap })}</T>
              </View>
              {current ? <Chip label={t('plan.current')} tone="accent" /> : (
                <Button small variant="secondary" title={t('plan.select')} loading={busy === item.tier} onPress={() => choose(item)} />
              )}
            </View>
          </Card>
        );
      })}

      <T muted size={12} style={{ marginTop: 8 }}>{t('plan.billingNote')}</T>
    </ScrollView>
  );
}
