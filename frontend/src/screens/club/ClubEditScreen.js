import React, { useEffect, useState } from 'react';
import { ScrollView, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { showError } from '../../utils/errors';
import { parseMoney, groupDigits } from '../../utils/format';
import { toast } from '../../components/Toast';
import { Field, MoneyField, Button, ErrorState, Loading } from '../../components/ui';

export default function ClubEditScreen({ route, navigation }) {
  const { clubId } = route.params;
  const { t } = useI18n();
  const { data, error, loading, retry } = useLoad(() => api.get(`/api/clubs/${clubId}`), [clubId]);
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data?.club) {
      setName(data.club.name);
      setFee(groupDigits(String(Number(data.club.monthly_fee_default) || '')));
    }
  }, [data?.club?.id]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  async function save() {
    if (!name.trim()) return Alert.alert(t('club.nameRequired'), t('club.nameRequiredBody'));
    try {
      setSaving(true);
      const { club } = await api.patch(`/api/clubs/${clubId}`, { name: name.trim(), monthly_fee_default: parseMoney(fee) });
      toast(t('common.saved'));
      navigation.navigate('ClubHome', { clubId, clubName: club.name });
    } catch (e) {
      showError(t('common.saveFailed'), e, navigation);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
      <Field label={t('club.name')} value={name} onChangeText={setName} />
      <MoneyField label={t('club.defaultFee')} value={fee} onChangeText={setFee} hint={t('club.defaultFeeHint')} />
      <Button title={t('common.save')} onPress={save} loading={saving} />
    </ScrollView>
  );
}
