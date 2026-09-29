import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { showError } from '../../utils/errors';
import { formatMoney, parseMoney, groupDigits, formatDateTime, localMonthKey } from '../../utils/format';
import { toast } from '../../components/Toast';
import { colors } from '../../theme';
import { T, Card, Button, Field, MoneyField, Segmented, Chip, Avatar, EmptyState, ErrorState, Loading, SectionHeader } from '../../components/ui';

export default function FundScreen({ route, navigation }) {
  const { clubId } = route.params;
  const { t } = useI18n();
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(async () => {
    const [c, b, tx, m] = await Promise.all([
      api.get(`/api/clubs/${clubId}`),
      api.get(`/api/clubs/${clubId}/fund-balance`),
      api.get(`/api/transactions?club_id=${clubId}`),
      api.get(`/api/clubs/${clubId}/members`),
    ]);
    return { club: c.club, balance: b.balance, txns: tx.transactions, members: m.members };
  }, [clubId]);

  const [feeAmount, setFeeAmount] = useState('');
  const [showCollect, setShowCollect] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [category, setCategory] = useState('court_cost');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);

  const CATEGORIES = [
    { value: 'court_cost', label: t('fund.court') },
    { value: 'ball_cost', label: t('fund.balls') },
    { value: 'other', label: t('fund.other') },
  ];
  const sourceLabel = (src) => t(`fund.src.${src}`);

  // Pre-fill the monthly fee once, from the club's default.
  const defaultFee = data?.club?.monthly_fee_default;
  useEffect(() => {
    if (defaultFee !== undefined && feeAmount === '') setFeeAmount(groupDigits(String(Number(defaultFee) || '')));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultFee]);

  const thisMonth = localMonthKey(new Date().toISOString());
  const paidIds = useMemo(() => {
    const set = new Set();
    (data?.txns || []).forEach((tx) => {
      if (!tx.is_voided && tx.source === 'membership_fee' && tx.related_member_id && localMonthKey(tx.created_at) === thisMonth) {
        set.add(tx.related_member_id);
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
    if (fee <= 0) return Alert.alert(t('fund.setFee'), t('fund.setFeeBody'));
    try {
      setBusyId(member.id);
      await api.post('/api/transactions', {
        club_id: clubId, type: 'income', source: 'membership_fee', amount: fee,
        description: t('fund.feeDesc', { name: member.display_name }), related_member_id: member.id,
      });
      toast(t('fund.collected', { name: member.display_name }));
      reload();
    } catch (e) {
      showError(t('fund.collectFailed'), e, navigation);
    } finally {
      setBusyId(null);
    }
  }

  async function addExpense() {
    const value = parseMoney(amount);
    if (value <= 0) return Alert.alert(t('common.invalidAmount'), t('common.amountPositive'));
    const label = desc.trim() || CATEGORIES.find((c) => c.value === category).label;
    try {
      setSaving(true);
      await api.post('/api/transactions', { club_id: clubId, type: 'expense', source: category, amount: value, description: label });
      setDesc(''); setAmount('');
      toast(t('fund.expenseAdded'));
      reload();
    } catch (e) {
      showError(t('fund.expenseFailed'), e, navigation);
    } finally {
      setSaving(false);
    }
  }

  function confirmVoid(tx) {
    if (tx.is_voided) return;
    Alert.alert(t('fund.voidTitle'), t('fund.voidBody', { name: tx.description || sourceLabel(tx.source), amount: formatMoney(tx.amount) }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.void'), style: 'destructive',
        onPress: async () => {
          try { await api.post(`/api/transactions/${tx.id}/void`, { void_reason: 'Voided by host' }); toast(t('fund.voided')); reload(); }
          catch (e) { showError(t('fund.voidFailed'), e, navigation); }
        },
      },
    ]);
  }

  const positive = Number(bal.balance) >= 0;

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
    >
      <View style={{ backgroundColor: positive ? '#1E3A8A' : '#7F1D1D', borderRadius: 16, padding: 18 }}>
        <T size={13} style={{ color: '#BFDBFE' }}>{t('fund.balance')}</T>
        <T bold size={32} style={{ marginVertical: 4 }}>{formatMoney(bal.balance)}</T>
        <T size={12} style={{ color: '#DBEAFE' }}>
          {t('fund.inOut', { inc: formatMoney(bal.total_income), out: formatMoney(bal.total_expense) })}
        </T>
      </View>

      <SectionHeader
        title={t('fund.monthlyFees', { n: unpaid.length })}
        right={<T muted size={13} bold onPress={() => setShowCollect((v) => !v)}>{showCollect ? t('common.hide') : t('common.show')}</T>}
      />
      {showCollect ? (
        <Card>
          <MoneyField label={t('fund.feePerMember')} value={feeAmount} onChangeText={setFeeAmount} />
          {fixedMembers.length === 0 ? (
            <T muted>{t('fund.noFixed')}</T>
          ) : (
            fixedMembers.map((m) => {
              const paid = paidIds.has(m.id);
              return (
                <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 }}>
                  <Avatar name={m.display_name} size={32} />
                  <T style={{ flex: 1 }} numberOfLines={1}>{m.display_name}</T>
                  {paid ? <Chip label={t('fund.paid')} tone="ok" icon="checkmark" /> : (
                    <Button title={t('fund.collect')} small loading={busyId === m.id} onPress={() => collect(m)} />
                  )}
                </View>
              );
            })
          )}
        </Card>
      ) : null}

      <SectionHeader title={t('fund.addExpense')} />
      <Card>
        <Segmented value={category} onChange={setCategory} options={CATEGORIES} />
        <Field label={t('fund.note')} value={desc} onChangeText={setDesc} placeholder={t('fund.notePlaceholder')} />
        <MoneyField label={t('common.amount')} value={amount} onChangeText={setAmount} placeholder="450.000" />
        <Button title={t('fund.addExpense')} variant="secondary" onPress={addExpense} loading={saving} />
      </Card>

      <SectionHeader title={t('fund.history')} />
      {data.txns.length === 0 ? (
        <EmptyState icon="wallet-outline" title={t('fund.emptyTitle')} subtitle={t('fund.emptyBody')} />
      ) : (
        <>
          <T muted size={12} style={{ marginBottom: 8 }}>{t('fund.historyHint')}</T>
          {data.txns.slice(0, 40).map((tx) => {
            const income = tx.type === 'income';
            return (
              <Card key={tx.id} onLongPress={() => confirmVoid(tx)} style={{ opacity: tx.is_voided ? 0.45 : 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <T bold style={tx.is_voided ? { textDecorationLine: 'line-through' } : null} numberOfLines={2}>
                      {tx.description || sourceLabel(tx.source)}
                    </T>
                    <T muted size={11} style={{ marginTop: 2 }}>{sourceLabel(tx.source)} · {formatDateTime(tx.created_at)}</T>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <T bold style={{ color: income ? colors.ok : '#F87171' }}>{income ? '+' : '−'}{formatMoney(tx.amount)}</T>
                    {tx.is_voided ? <Chip label={t('common.voided')} tone="warn" /> : null}
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
