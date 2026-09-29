import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, SectionList, RefreshControl, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useMode } from '../../context/ModeContext';
import { useI18n } from '../../i18n';
import { todayISO, relativeDay, monthTitle, weekdayShort, pad2 } from '../../utils/format';
import { colors } from '../../theme';
import { T, Button, Segmented, Pill, Field, IconButton, EmptyState, ErrorState, Loading, Fab } from '../../components/ui';
import EventCard from '../../components/EventCard';

// Month grid, Monday first (Vietnamese convention). Returns ISO date strings or null for padding cells.
function buildMonth(year, month) {
  const firstDow = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= days; d += 1) cells.push(`${year}-${pad2(month + 1)}-${pad2(d)}`);
  while (cells.length % 7) cells.push(null);
  return cells;
}

export default function ScheduleScreen({ navigation }) {
  const { t } = useI18n();
  const { intent, clearIntent } = useMode();
  const { data, error, loading, refreshing, refresh, retry } = useLoad(() => api.get('/api/events'), []);

  const today = todayISO();
  const [view, setView] = useState('calendar'); // 'calendar' | 'list'
  const [selected, setSelected] = useState(today);
  const [cursor, setCursor] = useState(() => { const [y, m] = today.split('-').map(Number); return { y, m: m - 1 }; });
  const [scope, setScope] = useState('upcoming');
  const [clubFilter, setClubFilter] = useState(null);
  const [query, setQuery] = useState('');

  // Arriving from the club workspace ("open this event" / "new event for this club")
  useEffect(() => {
    if (!intent) return;
    if (intent.type === 'event') {
      navigation.navigate('EventHome', { eventId: intent.eventId, eventTitle: intent.eventTitle });
      clearIntent();
    } else if (intent.type === 'newEvent') {
      navigation.navigate('EventForm', { clubId: intent.clubId });
      clearIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  const events = data?.events || [];

  const byDate = useMemo(() => {
    const map = {};
    events.forEach((e) => { (map[e.event_date] = map[e.event_date] || []).push(e); });
    Object.values(map).forEach((list) => list.sort((a, b) => String(a.start_time).localeCompare(String(b.start_time))));
    return map;
  }, [events]);

  const clubs = useMemo(() => {
    const seen = new Map();
    events.forEach((e) => { if (e.club_id && !seen.has(e.club_id)) seen.set(e.club_id, e.club_name); });
    return [...seen.entries()].map(([id, name]) => ({ id, name }));
  }, [events]);

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = events.filter((e) => (scope === 'upcoming' ? e.event_date >= today : e.event_date < today));
    if (clubFilter) list = list.filter((e) => e.club_id === clubFilter);
    if (q) list = list.filter((e) => e.title.toLowerCase().includes(q) || (e.location || '').toLowerCase().includes(q));
    list.sort((a, b) => {
      const ka = a.event_date + String(a.start_time);
      const kb = b.event_date + String(b.start_time);
      return scope === 'upcoming' ? ka.localeCompare(kb) : kb.localeCompare(ka);
    });
    const groups = [];
    list.forEach((e) => {
      const last = groups[groups.length - 1];
      if (last && last.date === e.event_date) last.data.push(e);
      else groups.push({ date: e.event_date, data: [e] });
    });
    return groups;
  }, [events, scope, clubFilter, query, today]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const openDetail = (e) => navigation.navigate('EventHome', { eventId: e.id, eventTitle: e.title });
  const createOn = (date) => navigation.navigate('EventForm', { date });

  function shiftMonth(delta) {
    const d = new Date(Date.UTC(cursor.y, cursor.m + delta, 1));
    const next = { y: d.getUTCFullYear(), m: d.getUTCMonth() };
    setCursor(next);
    const first = `${next.y}-${pad2(next.m + 1)}-01`;
    setSelected(today.startsWith(`${next.y}-${pad2(next.m + 1)}`) ? today : first);
  }
  function jumpToday() {
    const [y, m] = today.split('-').map(Number);
    setCursor({ y, m: m - 1 });
    setSelected(today);
  }

  const dayEvents = byDate[selected] || [];
  const refreshControl = <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />;

  const viewToggle = (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <Segmented
        value={view}
        onChange={setView}
        options={[{ value: 'calendar', label: t('schedule.calendar') }, { value: 'list', label: t('schedule.list') }]}
        style={{ marginBottom: 0 }}
      />
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      {viewToggle}

      {view === 'calendar' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 110 }} refreshControl={refreshControl}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <IconButton name="chevron-back" onPress={() => shiftMonth(-1)} />
            <Pressable onPress={jumpToday}><T bold size={17}>{monthTitle(cursor.y, cursor.m)}</T></Pressable>
            <IconButton name="chevron-forward" onPress={() => shiftMonth(1)} />
          </View>

          <View style={{ flexDirection: 'row', marginBottom: 4 }}>
            {[1, 2, 3, 4, 5, 6, 0].map((dow) => (
              <View key={dow} style={{ width: `${100 / 7}%`, alignItems: 'center' }}>
                <T muted size={11} bold>{weekdayShort(dow)}</T>
              </View>
            ))}
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {buildMonth(cursor.y, cursor.m).map((iso, i) => {
              if (!iso) return <View key={`pad${i}`} style={{ width: `${100 / 7}%`, height: 50 }} />;
              const isSel = iso === selected;
              const isToday = iso === today;
              const list = byDate[iso] || [];
              return (
                <Pressable key={iso} onPress={() => setSelected(iso)} style={{ width: `${100 / 7}%`, height: 50, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{
                    width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: isSel ? colors.accent : 'transparent',
                    borderWidth: isToday && !isSel ? 1 : 0, borderColor: colors.accent,
                  }}>
                    <T bold={isSel || isToday} style={{ color: isSel ? colors.onAccent : colors.text }}>{Number(iso.slice(8))}</T>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 2, height: 5, marginTop: 1 }}>
                    {list.slice(0, 3).map((e) => (
                      <View key={e.id} style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: e.status === 'cancelled' ? colors.muted : colors.info }} />
                    ))}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 10 }}>
            <T bold size={16}>{relativeDay(selected)}</T>
            <T muted size={13}>{t('schedule.eventCount', { count: dayEvents.length })}</T>
          </View>
          {dayEvents.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={t('schedule.emptyDay')}
              action={<Button small variant="secondary" icon="add" title={t('schedule.createOnDay')} onPress={() => createOn(selected)} />}
            />
          ) : (
            dayEvents.map((e) => <EventCard key={e.id} event={e} onPress={() => openDetail(e)} />)
          )}
        </ScrollView>
      ) : (
        <SectionList
          sections={sections.map((g) => ({ title: g.date, data: g.data }))}
          keyExtractor={(e) => e.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          refreshControl={refreshControl}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <View>
              <Segmented
                value={scope}
                onChange={setScope}
                options={[{ value: 'upcoming', label: t('schedule.upcoming') }, { value: 'past', label: t('schedule.past') }]}
              />
              {clubs.length > 0 ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
                  <Pill label={t('schedule.allClubs')} active={!clubFilter} onPress={() => setClubFilter(null)} />
                  {clubs.map((c) => <Pill key={c.id} icon="people" label={c.name} active={clubFilter === c.id} onPress={() => setClubFilter(clubFilter === c.id ? null : c.id)} />)}
                </ScrollView>
              ) : null}
              {events.length > 6 ? <Field value={query} onChangeText={setQuery} placeholder={t('schedule.search')} autoCorrect={false} /> : null}
            </View>
          }
          renderSectionHeader={({ section }) => (
            <T bold muted size={13} style={{ marginTop: 8, marginBottom: 8, textTransform: 'capitalize' }}>{relativeDay(section.title)}</T>
          )}
          renderItem={({ item }) => <EventCard event={item} onPress={() => openDetail(item)} />}
          ListEmptyComponent={
            <EmptyState
              icon="calendar-outline"
              title={events.length === 0 ? t('schedule.emptyTitle') : scope === 'upcoming' ? t('schedule.emptyUpcoming') : t('schedule.emptyPast')}
              subtitle={events.length === 0 ? t('schedule.emptyBody') : undefined}
            />
          }
        />
      )}

      <Fab icon="add" label={t('schedule.newEvent')} onPress={() => createOn(view === 'calendar' ? selected : undefined)} />
    </View>
  );
}
