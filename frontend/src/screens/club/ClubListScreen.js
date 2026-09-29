import React, { useEffect, useState } from 'react';
import { FlatList, RefreshControl, View, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useMode } from '../../context/ModeContext';
import { useI18n } from '../../i18n';
import { showError } from '../../utils/errors';
import { parseMoney, formatMoney, todayISO } from '../../utils/format';
import { colors, radius } from '../../theme';
import { T, Card, Button, Field, MoneyField, EmptyState, ErrorState, Loading, FormModal, Fab } from '../../components/ui';
import CapacityBanner from '../../components/CapacityBanner';

export default function ClubListScreen({ navigation }) {
  const { t } = useI18n();
  const { intent, clearIntent } = useMode();
  const { data, error, loading, refreshing, refresh, retry } = useLoad(() => api.get(`/api/clubs?today=${todayISO()}`), []);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  // Arriving from the event workspace ("open this club")
  useEffect(() => {
    if (intent?.type === 'club') {
      navigation.navigate('ClubHome', { clubId: intent.clubId, clubName: intent.clubName });
      clearIntent();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intent]);

  async function createClub() {
    if (!name.trim()) return Alert.alert(t('club.nameRequired'), t('club.nameRequiredBody'));
    try {
      setSaving(true);
      const { club } = await api.post('/api/clubs', { name: name.trim(), monthly_fee_default: parseMoney(fee) });
      setName(''); setFee(''); setCreating(false);
      navigation.navigate('ClubHome', { clubId: club.id, clubName: club.name });
    } catch (e) {
      showError(t('club.createFailed'), e, navigation);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const clubs = data?.clubs || [];

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={clubs}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
        ListHeaderComponent={<CapacityBanner />}
        ListEmptyComponent={
          <EmptyState
            icon="people-outline"
            title={t('club.emptyTitle')}
            subtitle={t('club.emptyBody')}
            action={<Button title={t('club.create')} icon="add" onPress={() => setCreating(true)} />}
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => navigation.navigate('ClubHome', { clubId: item.id, clubName: item.name })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 52, height: 52, borderRadius: radius.md, backgroundColor: colors.card2, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons name="people" size={26} color={colors.club} />
              </View>
              <View style={{ flex: 1 }}>
                <T bold size={17} numberOfLines={1}>{item.name}</T>
                <T muted size={12} style={{ marginTop: 3 }}>
                  {t('club.members', { count: item.member_count })} · {t('club.upcoming', { count: item.upcoming_events })}
                </T>
                <T muted size={12} style={{ marginTop: 2 }}>{t('club.monthlyFee')}: {formatMoney(item.monthly_fee_default)}</T>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.muted} />
            </View>
          </Card>
        )}
      />

      {clubs.length > 0 ? <Fab icon="add" label={t('club.newShort')} onPress={() => setCreating(true)} /> : null}

      <FormModal visible={creating} title={t('club.newTitle')} onClose={() => setCreating(false)}>
        <Field label={t('club.name')} value={name} onChangeText={setName} placeholder={t('club.namePlaceholder')} autoFocus />
        <MoneyField label={t('club.defaultFee')} value={fee} onChangeText={setFee} placeholder="200.000" />
        <Button title={t('club.create')} onPress={createClub} loading={saving} />
      </FormModal>
    </View>
  );
}
