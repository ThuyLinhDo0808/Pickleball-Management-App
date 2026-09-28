import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert, Switch } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { showError } from '../../utils/errors';
import { formatMoney, parseMoney, formatDateTime } from '../../utils/format';
import { colors } from '../../theme';
import { T, Card, Button, Field, Segmented, Chip, Empty, ErrorState, Loading, SectionTitle } from '../../components/ui';

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'completed', label: 'Done' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function EventFinanceScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(async () => {
    const [f, p, t] = await Promise.all([
      api.get(`/api/events/${eventId}/finance`),
      api.get(`/api/events/${eventId}/participants`),
      api.get(`/api/transactions?event_id=${eventId}`),
    ]);
    return { finance: f.finance, event: f.event, participants: p.participants, txns: t.transactions };
  }, [eventId]);

  const [courtCost, setCourtCost] = useState('');
  const [ballCost, setBallCost] = useState('');
  const [costsDirty, setCostsDirty] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);

  // Seed the cost fields from the event, but never overwrite what the host is typing.
  useEffect(() => {
    if (data?.event && !costsDirty) {
      setCourtCost(String(Number(data.event.court_cost) || ''));
      setBallCost(String(Number(data.event.ball_cost) || ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.event?.court_cost, data?.event?.ball_cost]);

  // Who is expected to pay: main-list people, plus anyone (even cancelled) already marked paid.
  const payers = useMemo(
    () => (data?.participants || []).filter((p) => ['registered', 'checked_in', 'no_show'].includes(p.status) || p.fee_paid),
    [data]
  );

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const { finance, event } = data;
  const feeOf = (p) => Number(p.fee_amount ?? event.fee_amount) || 0;
  const expected = payers.reduce((sum, p) => sum + feeOf(p), 0);
  const outstanding = payers.filter((p) => !p.fee_paid).reduce((sum, p) => sum + feeOf(p), 0);
  const profit = Number(finance?.profit_loss) || 0;
  const expenses = data.txns.filter((t) => t.type === 'expense');

  async function saveCosts() {
    try {
      setSavingCosts(true);
      await api.patch(`/api/events/${eventId}`, { court_cost: parseMoney(courtCost), ball_cost: parseMoney(ballCost) });
      setCostsDirty(false);
      reload();
    } catch (e) {
      showError('Could not save costs', e, navigation);
    } finally {
      setSavingCosts(false);
    }
  }

  async function toggleFee(p) {
    try {
      setBusyId(p.id);
      await api.patch(`/api/events/${eventId}/participants/${p.id}/fee`, { fee_paid: !p.fee_paid });
      reload();
    } catch (e) {
      showError('Could not update fee', e, navigation);
    } finally {
      setBusyId(null);
    }
  }

  async function addExpense() {
    const value = parseMoney(amount);
    if (!desc.trim() || value <= 0) return Alert.alert('Invalid expense', 'Enter a description and an amount greater than 0.');
    try {
      setSavingExpense(true);
      await api.post('/api/transactions', { event_id: eventId, type: 'expense', source: 'event_expense', amount: value, description: desc.trim() });
      setDesc(''); setAmount('');
      reload();
    } catch (e) {
      showError('Could not add expense', e, navigation);
    } finally {
      setSavingExpense(false);
    }
  }

  function confirmVoid(t) {
    if (t.is_voided) return;
    Alert.alert('Void this expense?', `${t.description} (${formatMoney(t.amount)}) will stay in the history but stop counting.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Void', style: 'destructive',
        onPress: async () => {
          try { await api.post(`/api/transactions/${t.id}/void`, { void_reason: 'Voided by host' }); reload(); }
          catch (e) { showError('Could not void expense', e, navigation); }
        },
      },
    ]);
  }

  async function setStatus(status) {
    if (status === event.status) return;
    try {
      await api.patch(`/api/events/${eventId}`, { status });
      reload();
    } catch (e) {
      showError('Could not change status', e, navigation);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
    >
      <View style={{ backgroundColor: profit >= 0 ? '#065F46' : '#7F1D1D', borderRadius: 14, padding: 16 }}>
        <T size={13} style={{ color: '#D1FAE5' }}>{profit >= 0 ? 'Profit (Lãi)' : 'Loss (Lỗ)'} · {event.title}</T>
        <T bold size={32} style={{ marginVertical: 4 }}>{formatMoney(profit)}</T>
        <T size={12} style={{ color: '#E2E8F0' }}>
          Collected {formatMoney(finance?.fees_collected)} · Court {formatMoney(event.court_cost)} · Balls {formatMoney(event.ball_cost)} · Other {formatMoney(finance?.other_expenses)}
        </T>
        <T size={12} style={{ color: '#E2E8F0', marginTop: 4 }}>
          Still to collect {formatMoney(outstanding)} of {formatMoney(expected)}
        </T>
      </View>

      <SectionTitle>Event status</SectionTitle>
      <Segmented value={event.status} onChange={setStatus} options={STATUS_OPTIONS} />
      <T muted size={12} style={{ marginTop: -6 }}>
        Mark the event "Done" when it's over. That also frees its seats in your plan limit.
      </T>

      <SectionTitle>Fixed costs</SectionTitle>
      <Card>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Field style={{ flex: 1 }} label="Court cost (₫)" value={courtCost} keyboardType="number-pad"
            onChangeText={(v) => { setCourtCost(v); setCostsDirty(true); }} />
          <Field style={{ flex: 1 }} label="Ball cost (₫)" value={ballCost} keyboardType="number-pad"
            onChangeText={(v) => { setBallCost(v); setCostsDirty(true); }} />
        </View>
        <Button title="Save costs" variant="muted" onPress={saveCosts} loading={savingCosts} disabled={!costsDirty} />
      </Card>

      <SectionTitle>Fees ({payers.filter((p) => p.fee_paid).length}/{payers.length} paid)</SectionTitle>
      {payers.length === 0 ? (
        <Empty title="No players yet" subtitle="Add players in the Players tab, then tick them off here as they pay." />
      ) : (
        payers.map((p) => (
          <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <T bold>{p.display_name}</T>
              <T muted size={12} style={{ marginTop: 2 }}>
                {formatMoney(feeOf(p))}{p.status === 'no_show' ? ' · no-show' : p.status === 'cancelled' ? ' · cancelled' : ''}
              </T>
            </View>
            {p.fee_paid ? <Chip label="Paid" tone="ok" /> : null}
            <Switch
              style={{ marginLeft: 10 }}
              value={p.fee_paid}
              disabled={busyId === p.id}
              onValueChange={() => toggleFee(p)}
              trackColor={{ true: colors.event }}
            />
          </Card>
        ))
      )}

      <SectionTitle>Other expenses</SectionTitle>
      <Card>
        <Field label="What for" value={desc} onChangeText={setDesc} placeholder="e.g. Extra balls, drinks" />
        <Field label="Amount (₫)" value={amount} onChangeText={setAmount} keyboardType="number-pad" />
        <Button title="Add expense" variant="muted" onPress={addExpense} loading={savingExpense} />
      </Card>
      {expenses.length > 0 ? (
        <>
          <T muted size={12} style={{ marginBottom: 8 }}>Long-press an expense to void it.</T>
          {expenses.map((t) => (
            <Card key={t.id} onLongPress={() => confirmVoid(t)} style={{ opacity: t.is_voided ? 0.45 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <T bold style={t.is_voided ? { textDecorationLine: 'line-through' } : null}>{t.description}</T>
                  <T muted size={11} style={{ marginTop: 2 }}>{formatDateTime(t.created_at)}</T>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <T bold style={{ color: '#F87171' }}>−{formatMoney(t.amount)}</T>
                  {t.is_voided ? <Chip label="Voided" tone="warn" /> : null}
                </View>
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
