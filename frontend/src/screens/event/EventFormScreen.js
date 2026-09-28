import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { api } from '../../services/api';
import { showError } from '../../utils/errors';
import { todayISO, isValidDate, isValidTime, parseMoney } from '../../utils/format';
import { T, Button, Field } from '../../components/ui';

export default function EventFormScreen({ navigation }) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(todayISO());
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('21:00');
  const [location, setLocation] = useState('');
  const [courts, setCourts] = useState('2');
  const [slots, setSlots] = useState('12');
  const [level, setLevel] = useState('');
  const [fee, setFee] = useState('');
  const [courtCost, setCourtCost] = useState('');
  const [ballCost, setBallCost] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  async function submit() {
    const e = {};
    if (!title.trim()) e.title = 'Give the event a name.';
    if (!isValidDate(date)) e.date = 'Use YYYY-MM-DD, e.g. 2026-10-03.';
    if (!isValidTime(start)) e.start = 'Use 24h HH:MM.';
    if (end.trim() && !isValidTime(end)) e.end = 'Use 24h HH:MM.';
    const nCourts = Number(courts);
    const nSlots = Number(slots);
    if (!Number.isInteger(nCourts) || nCourts < 1) e.courts = 'At least 1.';
    if (!Number.isInteger(nSlots) || nSlots < 1) e.slots = 'At least 1.';
    const lvl = level.trim() ? Number(level.replace(',', '.')) : null;
    if (lvl !== null && (!Number.isFinite(lvl) || lvl < 0 || lvl > 9.99)) e.level = 'e.g. 3.0';
    setErrors(e);
    if (Object.keys(e).length) return;

    try {
      setSaving(true);
      const { event } = await api.post('/api/events', {
        title: title.trim(), event_date: date, start_time: start, end_time: end.trim() || null,
        location: location.trim() || null, num_courts: nCourts, max_slots: nSlots,
        required_level: lvl, fee_amount: parseMoney(fee), court_cost: parseMoney(courtCost), ball_cost: parseMoney(ballCost),
      });
      navigation.replace('EventHome', { eventId: event.id, eventTitle: event.title });
    } catch (err) {
      showError('Could not create event', err, navigation);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Field label="Event name" value={title} onChangeText={setTitle} error={errors.title} placeholder="e.g. Saturday night kèo" />
      <Field label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} error={errors.date} keyboardType="numbers-and-punctuation" autoCorrect={false} />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field style={{ flex: 1 }} label="Start (HH:MM)" value={start} onChangeText={setStart} error={errors.start} keyboardType="numbers-and-punctuation" />
        <Field style={{ flex: 1 }} label="End (optional)" value={end} onChangeText={setEnd} error={errors.end} keyboardType="numbers-and-punctuation" />
      </View>
      <Field label="Location (optional)" value={location} onChangeText={setLocation} placeholder="Court / venue" />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field style={{ flex: 1 }} label="Courts" value={courts} onChangeText={setCourts} error={errors.courts} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="Player slots" value={slots} onChangeText={setSlots} error={errors.slots} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="Min level" value={level} onChangeText={setLevel} error={errors.level} keyboardType="decimal-pad" placeholder="opt." />
      </View>
      <Field label="Fee per player (₫)" value={fee} onChangeText={setFee} keyboardType="number-pad" placeholder="e.g. 80000" />
      <T muted size={12} style={{ marginBottom: 8 }}>Costs you already know (you can change these later in Finance):</T>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <Field style={{ flex: 1 }} label="Court cost (₫)" value={courtCost} onChangeText={setCourtCost} keyboardType="number-pad" />
        <Field style={{ flex: 1 }} label="Ball cost (₫)" value={ballCost} onChangeText={setBallCost} keyboardType="number-pad" />
      </View>
      <Button title="Create event" variant="success" onPress={submit} loading={saving} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}
