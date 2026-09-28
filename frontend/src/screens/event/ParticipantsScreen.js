import React, { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { showError } from '../../utils/errors';
import { formatDate, formatTime, parseMoney } from '../../utils/format';
import { colors } from '../../theme';
import { T, Card, Button, Field, Chip, Empty, ErrorState, Loading, SectionTitle, FormModal } from '../../components/ui';
import CapacityBanner from '../../components/CapacityBanner';
import { STATUS_TONE } from './EventListScreen';

const P_TONE = { registered: 'info', checked_in: 'ok', no_show: 'danger', waitlist: 'warn', cancelled: 'neutral' };
const P_LABEL = { registered: 'Registered', checked_in: 'Checked in', no_show: 'No-show', waitlist: 'Waitlist', cancelled: 'Cancelled' };

export default function ParticipantsScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(async () => {
    const [e, p] = await Promise.all([
      api.get(`/api/events/${eventId}`),
      api.get(`/api/events/${eventId}/participants`),
    ]);
    return { event: e.event, participants: p.participants };
  }, [eventId]);

  const [adding, setAdding] = useState(false);
  const [showCancelled, setShowCancelled] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const groups = useMemo(() => {
    const all = data?.participants || [];
    return {
      main: all.filter((p) => ['registered', 'checked_in', 'no_show'].includes(p.status)),
      waitlist: all.filter((p) => p.status === 'waitlist'),
      cancelled: all.filter((p) => p.status === 'cancelled'),
    };
  }, [data]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const { event } = data;
  const checkedIn = groups.main.filter((p) => p.status === 'checked_in').length;
  const noShows = groups.main.filter((p) => p.status === 'no_show').length;

  async function act(p, action) {
    try {
      setBusyId(p.id);
      const res = await api.post(`/api/events/${eventId}/participants/${p.id}/${action}`, {});
      if (action === 'cancel' && res.promoted) {
        Alert.alert('Waitlist updated', `${res.promoted.display_name} moved from the waitlist to the main list.`);
      }
      reload();
    } catch (e) {
      showError('Could not update participant', e, navigation);
    } finally {
      setBusyId(null);
    }
  }

  function confirmCancel(p) {
    Alert.alert('Cancel registration?', `${p.display_name} will be removed from this event.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel registration', style: 'destructive', onPress: () => act(p, 'cancel') },
    ]);
  }

  const row = (p) => {
    const busy = busyId === p.id;
    return (
      <Card key={p.id}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <T bold size={16}>{p.display_name}</T>
            {p.phone ? <T muted size={12} style={{ marginTop: 2 }}>{p.phone}</T> : null}
          </View>
          <Chip label={P_LABEL[p.status]} tone={P_TONE[p.status]} />
        </View>
        {p.status !== 'cancelled' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {p.status === 'waitlist' ? (
              <Button small title="Move to main list" variant="success" disabled={busy} onPress={() => act(p, 'promote')} />
            ) : (
              <>
                {p.status !== 'checked_in' ? <Button small title="Check in" variant="success" disabled={busy} onPress={() => act(p, 'check-in')} /> : null}
                {p.status !== 'no_show' ? <Button small title="No-show" variant="muted" disabled={busy} onPress={() => act(p, 'no-show')} /> : null}
              </>
            )}
            <Button small title="Cancel" variant="ghost" disabled={busy} onPress={() => confirmCancel(p)} />
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
      >
        <CapacityBanner />
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <T bold size={18} style={{ flex: 1, paddingRight: 8 }}>{event.title}</T>
            <Chip label={event.status} tone={STATUS_TONE[event.status]} />
          </View>
          <T muted size={13} style={{ marginTop: 4 }}>
            {formatDate(event.event_date)} · {formatTime(event.start_time)}{event.location ? ` · ${event.location}` : ''}
          </T>
          <T style={{ marginTop: 10 }}>
            <T bold>{groups.main.length}</T><T muted> / {event.max_slots} slots</T>
            <T muted>   ·   {groups.waitlist.length} waitlisted   ·   {checkedIn} in   ·   {noShows} no-show</T>
          </T>
          {event.status !== 'open' ? (
            <T size={12} style={{ color: colors.warn, marginTop: 8 }}>
              Registration is closed. Set the event back to "open" in Finance to add people.
            </T>
          ) : null}
        </Card>

        <SectionTitle>Main list ({groups.main.length})</SectionTitle>
        {groups.main.length === 0 ? <Empty title="Nobody yet" subtitle='Tap "Add player" to start the list.' /> : groups.main.map(row)}

        {groups.waitlist.length > 0 ? (
          <>
            <SectionTitle>Waitlist ({groups.waitlist.length})</SectionTitle>
            {groups.waitlist.map(row)}
          </>
        ) : null}

        {groups.cancelled.length > 0 ? (
          <>
            <SectionTitle right={<T muted size={13} onPress={() => setShowCancelled((v) => !v)}>{showCancelled ? 'Hide' : 'Show'}</T>}>
              Cancelled ({groups.cancelled.length})
            </SectionTitle>
            {showCancelled ? groups.cancelled.map(row) : null}
          </>
        ) : null}
      </ScrollView>

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
        <Button title="+ Add player" variant="success" onPress={() => setAdding(true)} disabled={event.status !== 'open'} />
      </View>

      <FormModal visible={adding} title="Add player" onClose={() => setAdding(false)}>
        {adding ? (
          <AddForm
            eventId={eventId}
            event={event}
            navigation={navigation}
            onDone={() => { setAdding(false); reload(); }}
          />
        ) : null}
      </FormModal>
    </View>
  );
}

function AddForm({ eventId, event, navigation, onDone }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return Alert.alert('Name required', 'Enter the player\'s name.');
    try {
      setSaving(true);
      const res = await api.post(`/api/events/${eventId}/participants`, {
        display_name: name.trim(),
        phone: phone.trim() || null,
        fee_amount: fee.trim() ? parseMoney(fee) : null,
      });
      if (res.waitlisted) Alert.alert('Added to the waitlist', `The event is full, so ${res.participant.display_name} is on the waitlist.`);
      onDone();
    } catch (e) {
      showError('Could not add player', e, navigation);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Field label="Name" value={name} onChangeText={setName} placeholder="Player name" autoFocus />
      <Field label="Phone (optional, helps track reliability)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field
        label={`Custom fee (optional, default ${event.fee_amount ? String(Number(event.fee_amount)) : '0'} ₫)`}
        value={fee}
        onChangeText={setFee}
        keyboardType="number-pad"
      />
      <Button title="Add player" variant="success" onPress={save} loading={saving} />
    </View>
  );
}
