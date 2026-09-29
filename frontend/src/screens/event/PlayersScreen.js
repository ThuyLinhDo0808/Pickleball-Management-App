import React, { useMemo, useState } from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { colors } from '../../theme';
import { T, Card, Chip, Segmented, Avatar, EmptyState, ErrorState, Loading } from '../../components/ui';

function tone(pct) {
  if (pct === null || pct === undefined) return 'neutral';
  return pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : 'danger';
}

export default function PlayersScreen() {
  const { t } = useI18n();
  const { data, error, loading, refreshing, refresh, retry } = useLoad(() => api.get('/api/events/players/reliability'), []);
  const [order, setOrder] = useState('worst');

  const players = useMemo(() => {
    const list = [...(data?.players || [])];
    const score = (p) => (p.reliability_pct === null ? 101 : Number(p.reliability_pct));
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
          <Segmented value={order} onChange={setOrder} options={[{ value: 'worst', label: t('players.worstFirst') }, { value: 'best', label: t('players.bestFirst') }]} />
          <T muted size={12} style={{ marginBottom: 12 }}>{t('players.explain')}</T>
        </View>
      }
      ListEmptyComponent={<EmptyState icon="people-outline" title={t('players.emptyTitle')} subtitle={t('players.emptyBody')} />}
      renderItem={({ item }) => (
        <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={item.display_name} />
          <View style={{ flex: 1 }}>
            <T bold size={16} numberOfLines={1}>{item.display_name}</T>
            <T muted size={12} style={{ marginTop: 2 }}>{t('players.stats', { events: item.events_registered, shown: item.check_ins, noshow: item.no_shows })}</T>
          </View>
          <Chip label={item.reliability_pct === null ? t('players.noData') : `${Number(item.reliability_pct).toFixed(0)}%`} tone={tone(item.reliability_pct === null ? null : Number(item.reliability_pct))} />
        </Card>
      )}
    />
  );
}
