import React, { useEffect, useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert, Switch } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { showError, errorMessage } from '../../utils/errors';
import { formatMoney, parseMoney, groupDigits, formatDateTime } from '../../utils/format';
import { exportEventFinance } from '../../utils/exportExcel';
import { toast } from '../../components/Toast';
import { colors } from '../../theme';
import { EVENT_STATUSES } from '../../constants';
import { T, Card, Button, Field, MoneyField, Segmented, Chip, Avatar, EmptyState, ErrorState, Loading, SectionHeader, IconButton } from '../../components/ui';

export default function EventFinanceScreen({ route, navigation }) {
  const { eventId } = route.params;
  const { t } = useI18n();
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(async () => {
    const [f, p, tx] = await Promise.all([
      api.get(`/api/events/${eventId}/finance`),
      api.get(`/api/events/${eventId}/participants`),
      api.get(`/api/transactions?event_id=${eventId}`),
    ]);
    return { finance: f.finance, event: f.event, participants: p.participants, txns: tx.transactions };
  }, [eventId]);

  const [courtCost, setCourtCost] = useState('');
  const [ballCost, setBallCost] = useState('');
  const [costsDirty, setCostsDirty] = useState(false);
  const [savingCosts, setSavingCosts] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [savingExpense, setSavingExpense] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (data?.event && !costsDirty) {
      setCourtCost(groupDigits(String(Number(data.event.court_cost) || '')));
      setBallCost(groupDigits(String(Number(data.event.ball_cost) || '')));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.event?.court_cost, data?.event?.ball_cost]);

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
  const expenses = data.txns.filter((tx) => tx.type === 'expense');

  async function saveCosts() {
    try {
      setSavingCosts(true);
      await api.patch(`/api/events/${eventId}`, { court_cost: parseMoney(courtCost), ball_cost: parseMoney(ballCost) });
      setCostsDirty(false);
      toast(t('common.saved'));
      reload();
    } catch (e) {
      showError(t('common.saveFailed'), e, navigation);
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
      showError(t('finance.feeUpdateFailed'), e, navigation);
    } finally {
      setBusyId(null);
    }
  }

  async function addExpense() {
    const value = parseMoney(amount);
    if (!desc.trim() || value <= 0) return Alert.alert(t('common.invalidAmount'), t('finance.expenseInvalid'));
    try {
      setSavingExpense(true);
      await api.post('/api/transactions', { event_id: eventId, type: 'expense', source: 'event_expense', amount: value, description: desc.trim() });
      setDesc(''); setAmount('');
      toast(t('fund.expenseAdded'));
      reload();
    } catch (e) {
      showError(t('fund.expenseFailed'), e, navigation);
    } finally {
      setSavingExpense(false);
    }
  }

  function confirmVoid(tx) {
    if (tx.is_voided) return;
    Alert.alert(t('fund.voidTitle'), t('fund.voidBody', { name: tx.description, amount: formatMoney(tx.amount) }), [
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

  async function setStatus(status) {
    if (status === event.status) return;
    try {
      await api.patch(`/api/events/${eventId}`, { status });
      toast(t('finance.statusChanged', { status: t(`estatus.${status}`) }));
      reload();
    } catch (e) {
      showError(t('finance.statusFailed'), e, navigation);
    }
  }

  async function doExport() {
    try {
      setExporting(true);
      await exportEventFinance({ event, payers, expenses });
    } catch (e) {
      if (e.code !== 'SHARE_UNAVAILABLE' && String(e?.message || '').toLowerCase().includes('cancel')) return; // user dismissed the share sheet
      Alert.alert(t('finance.exportFailedTitle'), errorMessage(e));
    } finally {
      setExporting(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
    >
      <View style={{ backgroundColor: profit >= 0 ? '#065F46' : '#7F1D1D', borderRadius: 16, padding: 18 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <T size={13} style={{ color: '#D1FAE5', flex: 1 }}>{profit >= 0 ? t('finance.profit') : t('finance.loss')} · {event.title}</T>
          <IconButton name="share-outline" color="#fff" onPress={doExport} />
        </View>
        <T bold size={32} style={{ marginVertical: 4 }}>{formatMoney(profit)}</T>
        <T size={12} style={{ color: '#E2E8F0' }}>
          {t('finance.summaryLine', { collected: formatMoney(finance?.fees_collected), court: formatMoney(event.court_cost), balls: formatMoney(event.ball_cost), other: formatMoney(finance?.other_expenses) })}
        </T>
        <T size={12} style={{ color: '#E2E8F0', marginTop: 4 }}>
          {t('finance.stillToCollect', { outstanding: formatMoney(outstanding), expected: formatMoney(expected) })}
        </T>
      </View>

      <Button title={t('finance.exportExcel')} icon="download-outline" variant="secondary" onPress={doExport} loading={exporting} style={{ marginTop: 12 }} />
      <T muted size={11} style={{ marginTop: 6, textAlign: 'center' }}>{t('finance.exportHint')}</T>

      <SectionHeader title={t('finance.status')} />
      <Segmented value={event.status} onChange={setStatus} options={EVENT_STATUSES.map((v) => ({ value: v, label: t(`estatus.${v}`) }))} />
      <T muted size={12} style={{ marginTop: -6 }}>{t('finance.statusHint')}</T>

      <SectionHeader title={t('finance.fixedCosts')} />
      <Card>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <MoneyField style={{ flex: 1 }} label={t('eventForm.courtCost')} value={courtCost} onChangeText={(v) => { setCourtCost(v); setCostsDirty(true); }} />
          <MoneyField style={{ flex: 1 }} label={t('eventForm.ballCost')} value={ballCost} onChangeText={(v) => { setBallCost(v); setCostsDirty(true); }} />
        </View>
        <Button title={t('common.save')} variant="secondary" onPress={saveCosts} loading={savingCosts} disabled={!costsDirty} />
      </Card>

      <SectionHeader title={t('finance.fees', { paid: payers.filter((p) => p.fee_paid).length, total: payers.length })} />
      {payers.length === 0 ? (
        <EmptyState icon="cash-outline" title={t('finance.emptyPlayers')} subtitle={t('finance.emptyPlayersBody')} />
      ) : (
        payers.map((p) => (
          <Card key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar name={p.display_name} size={34} />
            <View style={{ flex: 1 }}>
              <T bold numberOfLines={1}>{p.display_name}</T>
              <T muted size={12} style={{ marginTop: 2 }}>
                {formatMoney(feeOf(p))}{p.status === 'no_show' ? ` · ${t('status.no_show')}` : p.status === 'cancelled' ? ` · ${t('status.cancelled')}` : ''}
              </T>
            </View>
            {p.fee_paid ? <Chip label={t('fund.paid')} tone="ok" /> : null}
            <Switch value={p.fee_paid} disabled={busyId === p.id} onValueChange={() => toggleFee(p)} trackColor={{ true: colors.accent }} />
          </Card>
        ))
      )}

      <SectionHeader title={t('finance.otherExpenses')} />
      <Card>
        <Field label={t('finance.whatFor')} value={desc} onChangeText={setDesc} placeholder={t('finance.whatForPlaceholder')} />
        <MoneyField label={t('common.amount')} value={amount} onChangeText={setAmount} />
        <Button title={t('fund.addExpense')} variant="secondary" onPress={addExpense} loading={savingExpense} />
      </Card>
      {expenses.length > 0 ? (
        <>
          <T muted size={12} style={{ marginBottom: 8 }}>{t('fund.historyHint')}</T>
          {expenses.map((tx) => (
            <Card key={tx.id} onLongPress={() => confirmVoid(tx)} style={{ opacity: tx.is_voided ? 0.45 : 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <T bold style={tx.is_voided ? { textDecorationLine: 'line-through' } : null} numberOfLines={2}>{tx.description}</T>
                  <T muted size={11} style={{ marginTop: 2 }}>{formatDateTime(tx.created_at)}</T>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <T bold style={{ color: '#F87171' }}>−{formatMoney(tx.amount)}</T>
                  {tx.is_voided ? <Chip label={t('common.voided')} tone="warn" /> : null}
                </View>
              </View>
            </Card>
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}
