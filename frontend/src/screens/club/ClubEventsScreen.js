import React, { useMemo, useState } from 'react';
import { View, FlatList, RefreshControl } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useMode } from '../../context/ModeContext';
import { useI18n } from '../../i18n';
import { todayISO } from '../../utils/format';
import { colors } from '../../theme';
import { T, Button, Segmented, EmptyState, ErrorState, Loading } from '../../components/ui';
import EventCard from '../../components/EventCard';

// The events held by this club. Tapping one opens it in the Xé Vé workspace
// (with its roster and finance); "New event" opens the create form with this club preselected.
export default function ClubEventsScreen({ route }) {
  const { clubId, clubName } = route.params;
  const { t } = useI18n();
  const { openEvent, openNewEvent } = useMode();
  const { data, error, loading, refreshing, refresh, retry } = useLoad(() => api.get(`/api/events?club_id=${clubId}`), [clubId]);
  const [scope, setScope] = useState('upcoming');

  const events = useMemo(() => {
    const today = todayISO();
    const all = data?.events || [];
    const upcoming = all.filter((e) => e.event_date >= today).sort((a, b) => (a.event_date + a.start_time).localeCompare(b.event_date + b.start_time));
    const past = all.filter((e) => e.event_date < today); // API already returns newest first
    return scope === 'upcoming' ? upcoming : past;
  }, [data, scope]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
      ListHeaderComponent={
        <View>
          <Button title={t('clubEvents.new')} icon="add" onPress={() => openNewEvent(clubId, clubName)} style={{ marginBottom: 14 }} />
          <Segmented
            value={scope}
            onChange={setScope}
            options={[{ value: 'upcoming', label: t('schedule.upcoming') }, { value: 'past', label: t('schedule.past') }]}
          />
        </View>
      }
      ListEmptyComponent={
        <EmptyState
          icon="calendar-outline"
          title={scope === 'upcoming' ? t('clubEvents.emptyUpcoming') : t('clubEvents.emptyPast')}
          subtitle={t('clubEvents.emptyBody')}
        />
      }
      renderItem={({ item }) => <EventCard event={item} showDate onPress={() => openEvent(item.id, item.title)} />}
    />
  );
}
