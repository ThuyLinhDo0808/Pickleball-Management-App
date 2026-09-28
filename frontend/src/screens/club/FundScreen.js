import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { showError } from '../../utils/errors';
import { formatMoney, parseMoney, formatDateTime, localMonthKey } from '../../utils/format';
import { colors } from '../../theme';
import { T, Card, Button, Field, Segmented, Chip, Empty, ErrorState, Loading, SectionTitle } from '../../components/ui';

const CATEGORIES = [
  { value: 'court_cost', label: 'Court' },
  { value: 'ball_cost', label: 'Balls' },
  { value: 'other', label: 'Other' },
];
const SOURCE_LABEL = { membership_fee: 'Monthly fee', court_cost: 'Court', ball_cost: 'Balls', other: 'Other', adjustment: 'Adjustment', event_fee: 'Fee', event_expense: 'Expense' };

export default function FundScreen({ route, navigation }) {
  const { clubId } = route.params;
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(async () => {
    const [c, b, t, m] = await Promise.all([
      api.get(`/api/clubs/${clubId}`),
      api.get(`/api/clubs/${clubId}/fund-balance`),
      api.get(`/api/transactions?club_id=${clubId}`),
      api.get(`/api/clubs/${clubId}/members`),
    ]);
    return { club: c.club, balance: b.balance, txns: t.transactions, members: m.members };
  }, [clubId]);

  const [feeAmount, setFeeAmount] = useState('');
  const [showCollect, setShowCollect] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [category, setCategory] = useState('court_cost');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  // Pre-fill the fee once, from the club's default.
  const defaultFee = data?.club?.monthly_fee_default;
  useEffect(() => {
    if (defaultFee !== undefined && feeAmount === '') setFeeAmount(String(Number(defaultFee) || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFee]);

  const thisMonth = localMonthKey(new Date().toISOString());
  const paidIds = useMemo(() => {
    const set = new Set();
    (data?.txns || []).forEach((t) => {
      if (!t.is_voided && t.source === 'membership_fee' && t.related_member_id && localMonthKey(t.created_at) === thisMonth) {
        set.add(t.related_member_id);
      }
    });
    return set;
  }, [data, thisMonth]);

  const fixedMembers = useMemo(
    () => (data?.members || []).filter((m) => m.status === 'active' && m.member_type === 'fixed'),
    [data]
  );

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const bal = data.balance;
  const unpaid = fixedMembers.filter((m) => !paidIds.has(m.id));

  async function collect(member) {
    const fee = parseMoney(feeAmount);
    if (fee <= 0) return Alert.alert('Set the fee', 'Enter the monthly fee amount above first.');
    try {
      setBusyId(member.id);
      await api.post('/api/transactions', {
        club_id: clubId, type: 'income', source: 'membership_fee', amount: fee,
        description: `Monthly fee – ${member.display_name}`, related_member_id: member.id,
      });
      reload();
    } catch (e) {
      showError('Could not record payment', e, navigation);
    } finally {
      setBusyId(null);
    }
  }

  async function addExpense() {
    const value = parseMoney(amount);
    if (value <= 0) return Alert.alert('Invalid amount', 'Enter an amount greater than 0.');
    const label = desc.trim() || CATEGORIES.find((c) => c.value === category).label;
    try {
      setSaving(true);
      await api.post('/api/transactions', { club_id: clubId, type: 'expense', source: category, amount: value, description: label });
      setDesc(''); setAmount('');
      reload();
    } catch (e) {
      showError('Could not add expense', e, navigation);
    } finally {
      setSaving(false);
    }
  }

  function confirmVoid(t) {
    if (t.is_voided) return;
    Alert.alert(
      'Void this entry?',
      `${t.description || SOURCE_LABEL[t.source]} (${formatMoney(t.amount)}) will be kept in the history but no longer counted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void', style: 'destructive',
          onPress: async () => {
            try { await api.post(`/api/transactions/${t.id}/void`, { void_reason: 'Voided by host' }); reload(); }
            catch (e) { showError('Could not void entry', e, navigation); }
          },
        },
      ]
    );
  }

  const positive = Number(bal.balance) >= 0;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
    >
      <View style={{ backgroundColor: positive ? '#1E3A8A' : '#7F1D1D', borderRadius: 14, padding: 16 }}>
        <T size={13} style={{ color: '#BFDBFE' }}>Fund balance</T>
        <T bold size={32} style={{ marginVertical: 4 }}>{formatMoney(bal.balance)}</T>
        <T size={12} style={{ color: '#DBEAFE' }}>
          In {formatMoney(bal.total_income)} · Out {formatMoney(bal.total_expense)}
        </T>
      </View>

      <SectionTitle
        right={<T muted size={13} onPress={() => setShowCollect((v) => !v)}>{showCollect ? 'Hide' : 'Show'}</T>}
      >
        Monthly fees ({unpaid.length} unpaid)
      </SectionTitle>
      {showCollect ? (
        <Card>
          <Field label="Fee per member this month (₫)" value={feeAmount} onChangeText={setFeeAmount} keyboardType="number-pad" />
          {fixedMembers.length === 0 ? (
            <T muted>No active fixed members. Add some in the Members tab.</T>
          ) : (
            fixedMembers.map((m) => {
              const paid = paidIds.has(m.id);
              return (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 }}>
                  <T style={{ flex: 1 }}>{m.display_name}</T>
                  {paid ? <Chip label="Paid ✓" tone="ok" /> : (
                    <Button title="Collect" small loading={busyId === m.id} onPress={() => collect(m)} />
                  )}
                </View>
              );
            })
          )}
        </Card>
      ) : null}

      <SectionTitle>Add expense</SectionTitle>
      <Card>
        <Segmented value={category} onChange={setCategory} options={CATEGORIES} />
        <Field label="Note (optional)" value={desc} onChangeText={setDesc} placeholder="e.g. Court rental, 3 hours" />
        <Field label="Amount (₫)" value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="e.g. 450000" />
        <Button title="Add expense" variant="muted" onPress={addExpense} loading={saving} />
      </Card>

      <SectionTitle>History</SectionTitle>
      {data.txns.length === 0 ? (
        <Empty title="No transactions yet" subtitle="Fee payments and expenses will be listed here." />
      ) : (
        <>
          <T muted size={12} style={{ marginBottom: 8 }}>Entries are never deleted. Long-press one to void it.</T>
          {data.txns.slice(0, 40).map((t) => {
            const income = t.type === 'income';
            return (
              <Card key={t.id} onLongPress={() => confirmVoid(t)} style={{ opacity: t.is_voided ? 0.45 : 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <T bold style={t.is_voided ? { textDecorationLine: 'line-through' } : null}>
                      {t.description || SOURCE_LABEL[t.source] || 'Entry'}
                    </T>
                    <T muted size={11} style={{ marginTop: 2 }}>
                      {SOURCE_LABEL[t.source] || t.source} · {formatDateTime(t.created_at)}
                    </T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <T bold style={{ color: income ? colors.ok : '#F87171' }}>
                      {income ? '+' : '−'}{formatMoney(t.amount)}
                    </T>
                    {t.is_voided ? <Chip label="Voided" tone="warn" /> : null}
                  </View>
                </View>
              </Card>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}
