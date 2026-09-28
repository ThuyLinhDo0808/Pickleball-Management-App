import React, { useState } from 'react';
import { ScrollView, View, Alert } from 'react-native';
import { api } from '../services/api';
import { useLoad } from '../hooks/useLoad';
import { showError } from '../utils/errors';
import { T, Card, Button, Chip, ErrorState, Loading } from '../components/ui';

const TIERS = [
  { tier: 'free', label: 'Free', cap: 30 },
  { tier: 'basic', label: 'Basic', cap: 100 },
  { tier: 'standard', label: 'Standard', cap: 300 },
  { tier: 'pro', label: 'Pro', cap: 1000 },
];

export default function PlanScreen({ navigation }) {
  const { data, error, loading, reload, retry } = useLoad(() => api.get('/api/host/me'), []);
  const [busy, setBusy] = useState(null);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const sub = data.subscription;

  function choose(t) {
    const overBy = sub.current_usage - t.cap;
    const warning = overBy > 0
      ? `\n\nYou currently use ${sub.current_usage}, which is over the ${t.cap} limit. Nothing is deleted, but you won't be able to add anyone until you're under it.`
      : '';
    Alert.alert(`Switch to ${t.label}?`, `Limit becomes ${t.cap} active members/participants.${warning}`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Switch',
        onPress: async () => {
          try {
            setBusy(t.tier);
            await api.post('/api/host/subscription', { tier: t.tier });
            reload();
          } catch (e) {
            showError('Could not change plan', e, navigation);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card>
        <T muted size={12}>Current usage</T>
        <T bold size={26} style={{ marginVertical: 2 }}>{sub.current_usage} / {sub.max_capacity}</T>
        <T muted size={12}>
          Counts your active club members plus players on upcoming events (finished and cancelled events don't count).
        </T>
      </Card>

      {TIERS.map((t) => {
        const current = t.tier === sub.tier;
        return (
          <Card key={t.tier} style={current ? { borderWidth: 1, borderColor: '#60A5FA' } : null}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <T bold size={18}>{t.label}</T>
                <T muted size={13} style={{ marginTop: 2 }}>Up to {t.cap} members & participants</T>
              </View>
              {current ? <Chip label="Current" tone="info" /> : (
                <Button small title="Select" variant="muted" loading={busy === t.tier} onPress={() => choose(t)} />
              )}
            </View>
          </Card>
        );
      })}

      <T muted size={12} style={{ marginTop: 8 }}>
        Billing isn't connected yet, so plans switch instantly for testing.
      </T>
    </ScrollView>
  );
}
