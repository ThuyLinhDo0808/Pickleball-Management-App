import React, { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { T, Card, Segmented, Chip, Avatar, EmptyState, ErrorState, Loading } from '../../components/ui';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingsScreen({ route }) {
  const { clubId } = route.params;
  const { t } = useI18n();
  const { data, error, loading, refreshing, refresh, retry } = useLoad(async () => {
    const [a, m] = await Promise.all([
      api.get(`/api/clubs/${clubId}/rankings/all-time`),
      api.get(`/api/clubs/${clubId}/rankings/monthly`),
    ]);
    return { allTime: a.rankings, monthly: m.rankings };
  }, [clubId]);
  const [scope, setScope] = useState('monthly');

  const rows = useMemo(() => {
    if (!data) return [];
    // The monthly view buckets by UTC month (date_trunc in the database).
    const monthKey = new Date().toISOString().slice(0, 7);
    const list = scope === 'monthly'
      ? data.monthly.filter((r) => String(r.month).slice(0, 7) === monthKey)
      : data.allTime;
    return [...list].sort(
      (x, y) => y.wins - x.wins || Number(y.win_rate_pct) - Number(x.win_rate_pct) || y.matches_played - x.matches_played
    );
  }, [data, scope]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
    >
      <Segmented
        value={scope}
        onChange={setScope}
        options={[{ value: 'monthly', label: t('rank.thisMonth') }, { value: 'all', label: t('rank.allTime') }]}
      />
      <T muted size={12} style={{ marginBottom: 12 }}>{t('rank.explain')}</T>

      {rows.length === 0 ? (
        <EmptyState
          icon="trophy-outline"
          title={scope === 'monthly' ? t('rank.emptyMonth') : t('rank.empty')}
          subtitle={t('rank.emptyBody')}
        />
      ) : (
        rows.map((r, i) => {
          const pct = Number(r.win_rate_pct || 0);
          return (
            <Card key={r.club_member_id + (r.month || '')} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <T bold size={i < 3 ? 22 : 15} style={{ width: 34, textAlign: 'center' }}>{i < 3 ? MEDALS[i] : i + 1}</T>
              <Avatar name={r.display_name} size={38} />
              <View style={{ flex: 1 }}>
                <T bold size={16} numberOfLines={1}>{r.display_name}</T>
                <T muted size={12} style={{ marginTop: 2 }}>{t('rank.record', { w: r.wins, l: r.losses, n: r.matches_played })}</T>
              </View>
              <Chip label={`${pct.toFixed(0)}%`} tone={pct >= 60 ? 'ok' : pct >= 40 ? 'warn' : 'danger'} />
            </Card>
          );
        })
      )}
    </ScrollView>
  );
}
