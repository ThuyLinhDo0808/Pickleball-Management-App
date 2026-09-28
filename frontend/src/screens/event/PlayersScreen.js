import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { colors } from '../../theme';
import { T, Card, Chip, Segmented, Empty, ErrorState, Loading } from '../../components/ui';

function tone(pct) {
  if (pct === null || pct === undefined) return 'neutral';
  return pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'danger';
}

export default function PlayersScreen() {
  const { data, error, loading, refreshing, refresh, retry } = useLoad(() => api.get('/api/events/players/reliability'), []);
  const [order, setOrder] = useState('worst');

  const players = useMemo(() => {
    const list = [...(data?.players || [])];
    const score = (p) => (p.reliability_pct === null ? 101 : Number(p.reliability_pct)); // unknown last
    list.sort((a, b) => (order === 'worst' ? score(a) - score(b) : score(b) - score(a)));
    return list;
  }, [data, order]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  return (
    <FlatList
      data={players}
      keyExtractor={(p) => p.player_key}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View>
          <Segmented
            value={order}
            onChange={setOrder}
            options={[{ value: 'worst', label: 'Least reliable first' }, { value: 'best', label: 'Most reliable first' }]}
          />
          <T muted size={12} style={{ marginBottom: 10 }}>
            Reliability = check-ins ÷ (check-ins + no-shows) across your past events. Players are matched by phone number, so save phones for accurate tracking.
          </T>
        </View>
      }
      ListEmptyComponent={<Empty title="No players yet" subtitle="Players appear here once they're added to an event." />}
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <T bold size={16}>{item.display_name}</T>
            <T muted size={12} style={{ marginTop: 2 }}>
              {item.events_registered} event{item.events_registered === 1 ? '' : 's'} · {item.check_ins} showed · {item.no_shows} no-show
            </T>
          </View>
          <Chip
            label={item.reliability_pct === null ? 'No data yet' : `${Number(item.reliability_pct).toFixed(0)}%`}
            tone={tone(item.reliability_pct === null ? null : Number(item.reliability_pct))}
          />
        </Card>
      )}
    />
  );
}
