import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { showError } from '../../utils/errors';
import { todayISO, parseMoney, groupDigits } from '../../utils/format';
import { toast } from '../../components/Toast';
import { T, Button, Field, MoneyField, Segmented, Pill, ErrorState, Loading, SectionHeader } from '../../components/ui';
import { DateField, TimeField } from '../../components/DateTimeFields';

// Create or edit an event. Create can also make a weekly series; an event can optionally belong to a club.
export default function EventFormScreen({ route, navigation }) {
  const { eventId, date: presetDate, clubId: presetClub } = route.params || {};
  const editing = !!eventId;
  const { t } = useI18n();

  const { data, error, loading, retry } = useLoad(async () => {
    const [c, e] = await Promise.all([
      api.get('/api/clubs'),
      editing ? api.get(`/api/events/${eventId}`) : Promise.resolve(null),
    ]);
    return { clubs: c.clubs, event: e ? e.event : null };
  }, [eventId]);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(presetDate || todayISO());
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('21:00');
  const [location, setLocation] = useState('');
  const [courts, setCourts] = useState('2');
  const [slots, setSlots] = useState('12');
  const [level, setLevel] = useState('');
  const [fee, setFee] = useState('');
  const [courtCost, setCourtCost] = useState('');
  const [ballCost, setBallCost] = useState('');
  const [clubId, setClubId] = useState(presetClub || null);
  const [repeat, setRepeat] = useState('none');
  const [repeatCount, setRepeatCount] = useState('4');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const seeded = useRef(false);

  // Editing: fill the form once the event has loaded.
  useEffect(() => {
    const ev = data?.event;
    if (!ev || seeded.current) return;
    seeded.current = true;
    setTitle(ev.title);
    setDate(ev.event_date);
    setStart(String(ev.start_time).slice(0, 5));
    setEnd(ev.end_time ? String(ev.end_time).slice(0, 5) : '');
    setLocation(ev.location || '');
    setCourts(String(ev.num_courts));
    setSlots(String(ev.max_slots));
    setLevel(ev.required_level != null ? String(Number(ev.required_level)) : '');
    setFee(groupDigits(String(Number(ev.fee_amount) || '')));
    setCourtCost(groupDigits(String(Number(ev.court_cost) || '')));
    setBallCost(groupDigits(String(Number(ev.ball_cost) || '')));
    setClubId(ev.club_id || null);
  }, [data]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  async function submit() {
    const e = {};
    if (!title.trim()) e.title = t('eventForm.titleRequired');
    if (end && end <= start) e.end = t('eventForm.endAfterStart');
    const nCourts = Number(courts);
    const nSlots = Number(slots);
    if (!Number.isInteger(nCourts) || nCourts < 1) e.courts = t('eventForm.atLeast1');
    if (!Number.isInteger(nSlots) || nSlots < 1) e.slots = t('eventForm.atLeast1');
    const lvl = level.trim() ? Number(level.replace(',', '.')) : null;
    if (lvl !== null && (!Number.isFinite(lvl) || lvl < 0 || lvl > 9.99)) e.level = t('eventForm.levelInvalid');
    const nRepeat = Number(repeatCount);
    if (!editing && repeat === 'weekly' && (!Number.isInteger(nRepeat) || nRepeat < 2 || nRepeat > 12)) e.repeat = t('eventForm.repeatInvalid');
    setErrors(e);
    if (Object.keys(e).length) return;

    const payload = {
      title: title.trim(), event_date: date, start_time: start, end_time: end || null,
      location: location.trim() || null, num_courts: nCourts, max_slots: nSlots, required_level: lvl,
      fee_amount: parseMoney(fee), court_cost: parseMoney(courtCost), ball_cost: parseMoney(ballCost),
      club_id: clubId,
    };

    try {
      setSaving(true);
      if (editing) {
        await api.patch(`/api/events/${eventId}`, payload);
        toast(t('common.saved'));
        navigation.navigate('EventHome', { eventId, eventTitle: payload.title });
      } else {
        const series = repeat === 'weekly' ? nRepeat : 1;
        const res = await api.post('/api/events', { ...payload, repeat_count: series });
        if (series > 1) {
          toast(t('eventForm.seriesCreated', { count: series }));
          navigation.goBack();
        } else {
          toast(t('eventForm.created'));
          navigation.replace('EventHome', { eventId: res.event.id, eventTitle: res.event.title });
        }
      }
    } catch (err) {
      showError(t('eventForm.saveFailed'), err, navigation);
    } finally {
      setSaving(false);
    }
  }

  const clubs = data?.clubs || [];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled">
      <Field label={t('eventForm.title')} value={title} onChangeText={setTitle} error={errors.title} placeholder={t('eventForm.titlePlaceholder')} />

      {clubs.length > 0 ? (
        <View style={{ marginBottom: 14 }}>
          <T muted size={12} bold style={{ marginBottom: 6 }}>{t('eventForm.club')}</T>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pill label={t('eventForm.noClub')} active={!clubId} onPress={() => setClubId(null)} />
            {clubs.map((c) => <Pill key={c.id} icon="people" label={c.name} active={clubId === c.id} onPress={() => setClubId(c.id)} />)}
          </ScrollView>
        </View>
      ) : null}

      <DateField label={t('eventForm.date')} value={date} onChange={setDate} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TimeField label={t('eventForm.start')} value={start} onChange={setStart} />
        <TimeField label={t('eventForm.end')} value={end} onChange={setEnd} onClear={() => setEnd('')} placeholder={t('eventForm.optional')} error={errors.end} />
      </View>

      <Field label={t('eventForm.location')} value={location} onChangeText={setLocation} placeholder={t('eventForm.locationPlaceholder')} />

      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field style={{ flex: 1 }} label={t('eventForm.courts')} value={courts} onChangeText={setCourts} error={errors.courts} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label={t('eventForm.slots')} value={slots} onChangeText={setSlots} error={errors.slots} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label={t('eventForm.level')} value={level} onChangeText={setLevel} error={errors.level} keyboardType="decimal-pad" placeholder={t('eventForm.optionalShort')} />
      </View>

      <MoneyField label={t('eventForm.fee')} value={fee} onChangeText={setFee} placeholder="80.000" />

      <SectionHeader title={t('eventForm.costs')} style={{ marginTop: 4 }} />
      <T muted size={12} style={{ marginBottom: 10, marginTop: -4 }}>{t('eventForm.costsHint')}</T>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <MoneyField style={{ flex: 1 }} label={t('eventForm.courtCost')} value={courtCost} onChangeText={setCourtCost} />
        <MoneyField style={{ flex: 1 }} label={t('eventForm.ballCost')} value={ballCost} onChangeText={setBallCost} />
      </View>

      {!editing ? (
        <>
          <SectionHeader title={t('eventForm.repeat')} style={{ marginTop: 4 }} />
          <Segmented
            value={repeat}
            onChange={setRepeat}
            options={[{ value: 'none', label: t('eventForm.repeatNone') }, { value: 'weekly', label: t('eventForm.repeatWeekly') }]}
          />
          {repeat === 'weekly' ? (
            <Field label={t('eventForm.repeatCount')} value={repeatCount} onChangeText={setRepeatCount} error={errors.repeat} keyboardType="number-pad" hint={t('eventForm.repeatHint')} />
          ) : null}
        </>
      ) : null}

      <Button title={editing ? t('common.save') : t('eventForm.create')} onPress={submit} loading={saving} style={{ marginTop: 12 }} />
    </ScrollView>
  );
}
