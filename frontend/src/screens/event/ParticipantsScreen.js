import React, { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { showError, errorMessage } from '../../utils/errors';
import { formatDate, formatTimeRange, parseMoney, groupDigits } from '../../utils/format';
import { toast } from '../../components/Toast';
import { colors } from '../../theme';
import { EVENT_TONE, PARTICIPANT_TONE } from '../../constants';
import { T, Card, Button, Field, MoneyField, Chip, Avatar, Checkbox, EmptyState, ErrorState, Loading, SectionHeader, FormModal, Fab } from '../../components/ui';

export default function ParticipantsScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { t } = useI18n();
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(async () => {
    const [e, p] = await Promise.all([
      api.get(`/api/events/${eventId}`),
      api.get(`/api/events/${eventId}/participants`),
    ]);
    return { event: e.event, participants: p.participants };
  }, [eventId]);

  const [showAdd, setShowAdd] = useState(null); // null | 'manual' | 'import'
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
      if (action === 'cancel' && res.promoted) toast(t('participants.promoted', { name: res.promoted.display_name }));
      reload();
    } catch (e) {
      showError(t('participants.updateFailed'), e, navigation);
    } finally {
      setBusyId(null);
    }
  }

  function confirmCancel(p) {
    Alert.alert(t('participants.cancelTitle'), t('participants.cancelBody', { name: p.display_name }), [
      { text: t('common.keep'), style: 'cancel' },
      { text: t('participants.cancelReg'), style: 'destructive', onPress: () => act(p, 'cancel') },
    ]);
  }

  const row = (p) => {
    const busy = busyId === p.id;
    return (
      <Card key={p.id}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Avatar name={p.display_name} />
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <T bold size={16} numberOfLines={1} style={{ flexShrink: 1 }}>{p.display_name}</T>
              {p.source_club_member_id ? <Ionicons name="people" size={13} color={colors.info} /> : null}
            </View>
            {p.phone ? <T muted size={12} style={{ marginTop: 2 }}>{p.phone}</T> : null}
          </View>
          <Chip label={t(`status.${p.status}`)} tone={PARTICIPANT_TONE[p.status]} />
        </View>
        {p.status !== 'cancelled' ? (
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {p.status === 'waitlist' ? (
              <Button small title={t('participants.promote')} disabled={busy} onPress={() => act(p, 'promote')} />
            ) : (
              <>
                {p.status !== 'checked_in' ? <Button small title={t('participants.checkIn')} disabled={busy} onPress={() => act(p, 'check-in')} /> : null}
                {p.status !== 'no_show' ? <Button small variant="secondary" title={t('participants.noShow')} disabled={busy} onPress={() => act(p, 'no-show')} /> : null}
              </>
            )}
            <Button small variant="ghost" title={t('common.cancel')} disabled={busy} onPress={() => confirmCancel(p)} />
          </View>
        ) : null}
      </Card>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
      >
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <T bold size={18} style={{ flex: 1, paddingRight: 8 }}>{event.title}</T>
            <Chip label={t(`estatus.${event.status}`)} tone={EVENT_TONE[event.status]} />
          </View>
          <T muted size={13} style={{ marginTop: 4 }}>
            {formatDate(event.event_date)} · {formatTimeRange(event.start_time, event.end_time)}{event.location ? ` · ${event.location}` : ''}
          </T>
          <T style={{ marginTop: 10 }}>
            <T bold>{groups.main.length}</T><T muted>{t('participants.ofSlots', { max: event.max_slots })}</T>
            <T muted>   ·   {t('participants.waitlistN', { n: groups.waitlist.length })}   ·   {t('participants.checkedInN', { n: checkedIn })}   ·   {t('participants.noShowN', { n: noShows })}</T>
          </T>
          {event.status !== 'open' ? (
            <T size={12} style={{ color: colors.warn, marginTop: 8 }}>{t('participants.notOpen')}</T>
          ) : null}
        </Card>

        <SectionHeader title={t('participants.mainList', { n: groups.main.length })} />
        {groups.main.length === 0 ? <EmptyState icon="person-add-outline" title={t('participants.emptyMain')} /> : groups.main.map(row)}

        {groups.waitlist.length > 0 ? (
          <>
            <SectionHeader title={t('participants.waitlistTitle', { n: groups.waitlist.length })} />
            {groups.waitlist.map(row)}
          </>
        ) : null}

        {groups.cancelled.length > 0 ? (
          <>
            <SectionHeader
              title={t('participants.cancelledTitle', { n: groups.cancelled.length })}
              right={<T muted size={13} bold onPress={() => setShowCancelled((v) => !v)}>{showCancelled ? t('common.hide') : t('common.show')}</T>}
            />
            {showCancelled ? groups.cancelled.map(row) : null}
          </>
        ) : null}
      </ScrollView>

      <Fab icon="person-add" label={t('participants.add')} onPress={() => setShowAdd('choose')} style={{ opacity: event.status !== 'open' ? 0.4 : 1 }} />

      <FormModal visible={showAdd === 'choose'} title={t('participants.addTitle')} onClose={() => setShowAdd(null)}>
        <Button title={t('participants.addManual')} icon="person-add" onPress={() => setShowAdd('manual')} style={{ marginBottom: 10 }} />
        <Button title={t('participants.importFromClub')} icon="people" variant="secondary" onPress={() => setShowAdd('import')} />
        <T muted size={12} style={{ marginTop: 10 }}>{t('participants.importHint')}</T>
      </FormModal>

      <FormModal visible={showAdd === 'manual'} title={t('participants.addManual')} onClose={() => setShowAdd(null)}>
        <ManualAddForm eventId={eventId} event={event} navigation={navigation} onDone={() => { setShowAdd(null); reload(); }} />
      </FormModal>

      <FormModal visible={showAdd === 'import'} title={t('participants.importFromClub')} onClose={() => setShowAdd(null)}>
        <ImportFromClub eventId={eventId} event={event} existing={data.participants} navigation={navigation} onDone={() => { setShowAdd(null); reload(); }} />
      </FormModal>
    </View>
  );
}

function ManualAddForm({ eventId, event, navigation, onDone }) {
  const { t } = useI18n();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return Alert.alert(t('participants.nameRequired'), t('participants.nameRequiredBody'));
    try {
      setSaving(true);
      const res = await api.post(`/api/events/${eventId}/participants`, {
        display_name: name.trim(), phone: phone.trim() || null,
        fee_amount: fee.trim() ? parseMoney(fee) : null,
      });
      toast(res.waitlisted ? t('participants.addedWaitlist', { name: res.participant.display_name }) : t('participants.added', { name: res.participant.display_name }));
      onDone();
    } catch (e) {
      showError(t('participants.addFailed'), e, navigation);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View>
      <Field label={t('participants.name')} value={name} onChangeText={setName} autoFocus />
      <Field label={t('participants.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" hint={t('participants.phoneHint')} />
      <MoneyField label={t('participants.customFee', { def: Number(event.fee_amount) || 0 })} value={fee} onChangeText={(v) => setFee(groupDigits(v))} />
      <Button title={t('participants.add')} onPress={save} loading={saving} />
    </View>
  );
}

// Pick a club, tick members, clone them into this event in one call.
function ImportFromClub({ eventId, event, existing, navigation, onDone }) {
  const { t } = useI18n();
  const { data, loading } = useLoad(() => api.get('/api/clubs'), []);
  const [clubId, setClubId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [importing, setImporting] = useState(false);

  const { data: membersData, loading: loadingMembers } = useLoad(
    () => (clubId ? api.get(`/api/clubs/${clubId}/members`) : Promise.resolve(null)),
    [clubId]
  );

  const takenKeys = useMemo(() => {
    const s = new Set();
    existing.filter((p) => p.status !== 'cancelled').forEach((p) => {
      if (p.source_club_member_id) s.add('id:' + p.source_club_member_id);
      if (p.phone) s.add('phone:' + p.phone.trim().toLowerCase());
      s.add('name:' + p.display_name.trim().toLowerCase());
    });
    return s;
  }, [existing]);

  const members = (membersData?.members || []).filter((m) => m.status === 'active');
  const alreadyIn = (m) => takenKeys.has('id:' + m.id) || (m.phone && takenKeys.has('phone:' + m.phone.trim().toLowerCase())) || takenKeys.has('name:' + m.display_name.trim().toLowerCase());

  function toggle(id) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function selectAllAvailable() {
    const available = members.filter((m) => !alreadyIn(m)).map((m) => m.id);
    setSelected(new Set(available));
  }

  async function doImport() {
    if (selected.size === 0) return;
    try {
      setImporting(true);
      const res = await api.post(`/api/events/${eventId}/participants/import`, { club_id: clubId, member_ids: [...selected] });
      const addedCount = res.added.length;
      const waitlisted = res.waitlisted;
      if (addedCount === 0) toast(t('participants.importNothing'), 'error');
      else if (waitlisted > 0) toast(t('participants.importedWithWaitlist', { count: addedCount, waitlisted }));
      else toast(t('participants.imported', { count: addedCount }));
      onDone();
    } catch (e) {
      showError(t('participants.importFailed'), e, navigation);
    } finally {
      setImporting(false);
    }
  }

  if (loading) return <Loading />;
  const clubs = data?.clubs || [];

  if (clubs.length === 0) {
    return <EmptyState icon="people-outline" title={t('participants.noClubs')} subtitle={t('participants.noClubsBody')} />;
  }

  if (!clubId) {
    return (
      <View>
        <T muted size={13} style={{ marginBottom: 12 }}>{t('participants.chooseClub')}</T>
        {clubs.map((c) => (
          <Card key={c.id} onPress={() => setClubId(c.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <Avatar name={c.name} />
            <View style={{ flex: 1 }}>
              <T bold>{c.name}</T>
              <T muted size={12}>{t('club.members', { count: c.member_count })}</T>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Card>
        ))}
      </View>
    );
  }

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <T bold onPress={() => { setClubId(null); setSelected(new Set()); }} style={{ color: colors.info }}>{'‹ ' + t('common.back')}</T>
        <T muted size={13} onPress={selectAllAvailable}>{t('participants.selectAll')}</T>
      </View>

      {loadingMembers ? <Loading /> : members.length === 0 ? (
        <EmptyState icon="person-outline" title={t('participants.noActiveMembers')} />
      ) : (
        <ScrollView style={{ maxHeight: 380 }} keyboardShouldPersistTaps="handled">
          {members.map((m) => {
            const taken = alreadyIn(m);
            const checked = selected.has(m.id);
            return (
              <Card key={m.id} onPress={() => !taken && toggle(m.id)} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: taken ? 0.45 : 1 }}>
                <Checkbox checked={checked && !taken} disabled={taken} />
                <Avatar name={m.display_name} size={34} />
                <View style={{ flex: 1 }}>
                  <T bold numberOfLines={1}>{m.display_name}</T>
                  <T muted size={12}>{m.dupr_level != null ? `DUPR ${Number(m.dupr_level).toFixed(2)}` : t('members.noRating')}</T>
                </View>
                {taken ? <Chip label={t('participants.alreadyIn')} tone="neutral" /> : null}
              </Card>
            );
          })}
        </ScrollView>
      )}

      <Button
        title={t('participants.importSelected', { n: selected.size })}
        icon="download"
        onPress={doImport}
        loading={importing}
        disabled={selected.size === 0}
        style={{ marginTop: 14 }}
      />
    </View>
  );
}
