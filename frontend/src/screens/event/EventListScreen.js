import React from 'react';
import { FlatList, RefreshControl, View } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { formatDate, formatTime, formatMoney } from '../../utils/format';
import { colors } from '../../theme';
import { T, Card, Button, Chip, Empty, ErrorState, Loading } from '../../components/ui';
import CapacityBanner from '../../components/CapacityBanner';

export const STATUS_TONE = { draft: 'neutral', open: 'ok', closed: 'warn', completed: 'info', cancelled: 'danger' };

export default function EventListScreen({ navigation }) {
  const { data, error, loading, refreshing, refresh, retry } = useLoad(() => api.get('/api/events'), []);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const header = (
    <View>
      <CapacityBanner />
      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
        <Button title="+ New event" variant="success" onPress={() => navigation.navigate('EventForm')} style={{ flex: 1 }} />
        <Button title="Player reliability" variant="muted" onPress={() => navigation.navigate('Reliability')} style={{ flex: 1 }} />
      </View>
    </View>
  );

  return (
    <FlatList
      data={data?.events || []}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ padding: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
      ListHeaderComponent={header}
      ListEmptyComponent={<Empty title="No events yet" subtitle="Create your first sự kiện to open registration, track check-ins and see your profit." />}
      renderItem={({ item }) => (
        <Card onPress={() => navigation.navigate('EventHome', { eventId: item.id, eventTitle: item.title })}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <T bold size={17} style={{ flex: 1, paddingRight: 8 }}>{item.title}</T>
            <Chip label={item.status} tone={STATUS_TONE[item.status]} />
          </View>
          <T muted size={13} style={{ marginTop: 4 }}>
            {formatDate(item.event_date)} · {formatTime(item.start_time)}
            {item.location ? ` · ${item.location}` : ''}
          </T>
          <T muted size={12} style={{ marginTop: 2 }}>
            {item.max_slots} slots · {item.num_courts} court{item.num_courts > 1 ? 's' : ''} · fee {formatMoney(item.fee_amount)}
          </T>
        </Card>
      )}
    />
  );
}
