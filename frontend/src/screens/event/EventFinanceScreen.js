import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet, Alert, ActivityIndicator, Switch,
} from 'react-native';
import { api } from '../../services/api';

// Per-event P&L: shows collected/uncollected fees, lets the host log court
// & ball costs, and surfaces the exact profit/loss for THIS event.
export default function EventFinanceScreen({ eventId }) {
  const [finance, setFinance] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ finance }, { participants }] = await Promise.all([
        api.get(`/api/events/${eventId}/finance`),
        api.get(`/api/events/${eventId}/participants`),
      ]);
      setFinance(finance);
      setParticipants(participants);
    } catch (err) {
      Alert.alert('Could not load event finance', err.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { loadData(); }, [loadData]);

  async function toggleFeePaid(participant) {
    try {
      await api.patch(`/api/events/${eventId}/participants/${participant.id}/fee`, {
        fee_paid: !participant.fee_paid,
      });
      if (!participant.fee_paid) {
        // Only log revenue the moment a fee actually gets marked as paid.
        await api.post('/api/transactions', {
          event_id: eventId,
          type: 'income',
          source: 'event_fee',
          amount: Number(participant.fee_amount) || 0,
          description: `Fee from ${participant.display_name}`,
          related_participant_id: participant.id,
        });
      }
      loadData();
    } catch (err) {
      if (err.code === 'CAPACITY_LIMIT_REACHED') {
        Alert.alert('Plan limit reached', err.message);
      } else {
        Alert.alert('Could not update fee status', err.message);
      }
    }
  }

  async function addExpense() {
    const amount = Number(expenseAmount);
    if (!expenseDesc.trim() || Number.isNaN(amount) || amount <= 0) {
      return Alert.alert('Invalid expense', 'Enter a description and a positive amount.');
    }
    try {
      setSaving(true);
      await api.post('/api/transactions', {
        event_id: eventId,
        type: 'expense',
        source: 'event_expense',
        amount,
        description: expenseDesc.trim(),
      });
      setExpenseDesc('');
      setExpenseAmount('');
      loadData();
    } catch (err) {
      Alert.alert('Could not add expense', err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  const profit = finance?.profit_loss ?? 0;

  return (
    <View style={styles.container}>
      <Text style={styles.header}>{finance?.title || 'Event'} — Finance</Text>

      <View style={[styles.plCard, { backgroundColor: profit >= 0 ? '#065F46' : '#7F1D1D' }]}>
        <Text style={styles.plLabel}>{profit >= 0 ? 'Profit (Lãi)' : 'Loss (Lỗ)'}</Text>
        <Text style={styles.plValue}>{profit.toLocaleString()} ₫</Text>
        <Text style={styles.plSub}>
          Collected {Number(finance?.fees_collected || 0).toLocaleString()} ₫ · Costs {Number(
            (finance?.fixed_costs || 0) + (finance?.other_expenses || 0)
          ).toLocaleString()} ₫
        </Text>
        <Text style={styles.plSub}>
          {finance?.fees_paid_count || 0} paid · {finance?.fees_uncollected_count || 0} uncollected
        </Text>
      </View>

      <Text style={styles.subheader}>Participants — tap to mark fee paid</Text>
      <FlatList
        data={participants}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.participantRow}>
            <View>
              <Text style={styles.participantName}>{item.display_name}</Text>
              <Text style={styles.participantStatus}>{item.status.replace('_', ' ')}</Text>
            </View>
            <Switch value={item.fee_paid} onValueChange={() => toggleFeePaid(item)} />
          </View>
        )}
        style={{ maxHeight: 220 }}
        ListEmptyComponent={<Text style={styles.empty}>No one registered yet.</Text>}
      />

      <Text style={styles.subheader}>Add an expense</Text>
      <View style={styles.expenseRow}>
        <TextInput
          style={styles.expenseInput}
          placeholder="e.g. Extra balls"
          placeholderTextColor="#94A3B8"
          value={expenseDesc}
          onChangeText={setExpenseDesc}
        />
        <TextInput
          style={[styles.expenseInput, { width: 90 }]}
          placeholder="Amount"
          placeholderTextColor="#94A3B8"
          keyboardType="number-pad"
          value={expenseAmount}
          onChangeText={setExpenseAmount}
        />
      </View>
      <Pressable style={styles.addButton} onPress={addExpense} disabled={saving}>
        <Text style={styles.addButtonText}>{saving ? 'Saving…' : 'Add Expense'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  header: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 12 },
  subheader: { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 18, marginBottom: 8 },
  plCard: { borderRadius: 14, padding: 16, marginBottom: 8 },
  plLabel: { color: '#D1FAE5', fontSize: 13, fontWeight: '600' },
  plValue: { color: '#fff', fontSize: 30, fontWeight: '800', marginVertical: 4 },
  plSub: { color: '#E2E8F0', fontSize: 12 },
  participantRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 6,
  },
  participantName: { color: '#fff', fontWeight: '600' },
  participantStatus: { color: '#94A3B8', fontSize: 12, textTransform: 'capitalize' },
  empty: { color: '#64748B', textAlign: 'center', marginTop: 12 },
  expenseRow: { flexDirection: 'row', gap: 8 },
  expenseInput: { flex: 1, backgroundColor: '#1E293B', color: '#fff', borderRadius: 8, padding: 10 },
  addButton: { backgroundColor: '#059669', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  addButtonText: { color: '#fff', fontWeight: '700' },
});
