import React, { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { colors } from '../../theme';
import { T, Card, Segmented, Chip, Empty, ErrorState, Loading } from '../../components/ui';

const MEDALS = ['🥇', '🥈', '🥉'];

export default function RankingsScreen({ route }) {
  const { clubId } = route.params;
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
        options={[{ value: 'monthly', label: 'This month' }, { value: 'all', label: 'All-time' }]}
      />
      <T muted size={12} style={{ marginBottom: 10 }}>Ranked by wins, then win rate.</T>

      {rows.length === 0 ? (
        <Empty
          title={scope === 'monthly' ? 'No matches this month' : 'No matches yet'}
          subtitle="Log matches in the Matches tab and the ranking builds itself."
        />
      ) : (
        rows.map((r, i) => (
          <Card key={r.club_member_id + (r.month || '')} style={{ flexDirection: 'row', alignItems: 'center' }}>
            <T size={i < 3 ? 22 : 15} bold style={{ width: 40, textAlign: 'center' }}>{i < 3 ? MEDALS[i] : i + 1}</T>
            <View style={{ flex: 1 }}>
              <T bold size={16}>{r.display_name}</T>
              <T muted size={12} style={{ marginTop: 2 }}>
                {r.wins}W – {r.losses}L · {r.matches_played} played
              </T>
            </View>
            <Chip
              label={`${Number(r.win_rate_pct || 0).toFixed(0)}%`}
              tone={Number(r.win_rate_pct) >= 60 ? 'ok' : Number(r.win_rate_pct) >= 40 ? 'warn' : 'danger'}
            />
          </Card>
        ))
      )}
    </ScrollView>
  );
}
