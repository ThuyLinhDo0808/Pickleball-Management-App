import React, { useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { showError } from '../../utils/errors';
import { toast } from '../../components/Toast';
import { colors } from '../../theme';
import { T, Card, Button, Field, Segmented, Chip, Avatar, EmptyState, ErrorState, Loading, FormModal, Fab } from '../../components/ui';
import CapacityBanner from '../../components/CapacityBanner';

export default function MembersScreen({ route, navigation }) {
  const { clubId } = route.params;
  const { t } = useI18n();
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(
    () => api.get(`/api/clubs/${clubId}/members`), [clubId]
  );
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | member object

  const members = useMemo(() => (data?.members || []).filter((m) => m.status !== 'removed'), [data]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => m.display_name.toLowerCase().includes(q)) : members;
  }, [members, query]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const active = members.filter((m) => m.status === 'active');
  const guests = active.filter((m) => m.member_type === 'guest').length;

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={filtered}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
        ListHeaderComponent={
          <View>
            <CapacityBanner />
            <T muted style={{ marginBottom: 12 }}>
              {t('members.summary', { active: active.length, fixed: active.length - guests, guests })}
            </T>
            {members.length > 8 ? (
              <Field value={query} onChangeText={setQuery} placeholder={t('members.search')} autoCorrect={false} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="person-add-outline"
            title={query ? t('members.noResults') : t('members.emptyTitle')}
            subtitle={query ? t('members.noResultsBody') : t('members.emptyBody')}
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => setEditing(item)} style={{ opacity: item.status === 'inactive' ? 0.6 : 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Avatar name={item.display_name} />
              <View style={{ flex: 1 }}>
                <T bold size={16} numberOfLines={1}>{item.display_name}</T>
                <T muted size={12} style={{ marginTop: 2 }}>
                  {item.dupr_level != null ? `DUPR ${Number(item.dupr_level).toFixed(2)}` : t('members.noRating')}
                  {item.phone ? ` · ${item.phone}` : ''}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Chip label={item.member_type === 'fixed' ? t('type.fixed') : t('type.guest')} tone={item.member_type === 'fixed' ? 'info' : 'neutral'} />
                {item.status === 'inactive' ? <Chip label={t('members.inactive')} tone="warn" /> : null}
              </View>
            </View>
          </Card>
        )}
      />

      <Fab icon="person-add" label={t('members.add')} onPress={() => setEditing('new')} />

      <FormModal visible={!!editing} title={editing === 'new' ? t('members.addTitle') : t('members.editTitle')} onClose={() => setEditing(null)}>
        {editing ? (
          <MemberForm
            key={editing === 'new' ? 'new' : editing.id}
            member={editing}
            clubId={clubId}
            navigation={navigation}
            onDone={(msg) => { setEditing(null); reload(); if (msg) toast(msg); }}
          />
        ) : null}
      </FormModal>
    </View>
  );
}

function MemberForm({ member, clubId, navigation, onDone }) {
  const { t } = useI18n();
  const isNew = member === 'new';
  const [name, setName] = useState(isNew ? '' : member.display_name);
  const [phone, setPhone] = useState(isNew ? '' : member.phone || '');
  const [dupr, setDupr] = useState(isNew || member.dupr_level == null ? '' : String(Number(member.dupr_level)));
  const [type, setType] = useState(isNew ? 'fixed' : member.member_type);
  const [status, setStatus] = useState(isNew ? 'active' : member.status);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  async function save() {
    const e = {};
    if (!name.trim()) e.name = t('members.nameRequired');
    const rating = dupr.trim() ? Number(dupr.replace(',', '.')) : null;
    if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 9.99)) e.dupr = t('members.duprInvalid');
    setErrors(e);
    if (Object.keys(e).length) return;

    const payload = { display_name: name.trim(), phone: phone.trim() || null, dupr_level: rating, member_type: type };
    if (!isNew) payload.status = status;
    try {
      setSaving(true);
      if (isNew) await api.post(`/api/clubs/${clubId}/members`, payload);
      else await api.patch(`/api/clubs/${clubId}/members/${member.id}`, payload);
      onDone(isNew ? t('members.added', { name: payload.display_name }) : t('common.saved'));
    } catch (err) {
      showError(t('members.saveFailed'), err, navigation);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    Alert.alert(t('members.removeTitle'), t('members.removeBody', { name: member.display_name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('members.remove'), style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/clubs/${clubId}/members/${member.id}`, { status: 'removed' });
            onDone(t('members.removed'));
          } catch (err) {
            showError(t('members.removeFailed'), err, navigation);
          }
        },
      },
    ]);
  }

  return (
    <View>
      <Field label={t('members.name')} value={name} onChangeText={setName} error={errors.name} autoFocus={isNew} />
      <Field label={t('members.phone')} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label={t('members.dupr')} value={dupr} onChangeText={setDupr} error={errors.dupr} keyboardType="decimal-pad" placeholder="3.50" />
      <T muted size={12} bold style={{ marginBottom: 6 }}>{t('members.type')}</T>
      <Segmented value={type} onChange={setType} options={[{ value: 'fixed', label: t('type.fixed') }, { value: 'guest', label: t('type.guest') }]} />
      {!isNew ? (
        <>
          <T muted size={12} bold style={{ marginBottom: 6 }}>{t('members.status')}</T>
          <Segmented value={status} onChange={setStatus} options={[{ value: 'active', label: t('members.active') }, { value: 'inactive', label: t('members.inactive') }]} />
        </>
      ) : null}
      <Button title={isNew ? t('members.add') : t('common.save')} onPress={save} loading={saving} />
      {!isNew ? <Button title={t('members.removeFromClub')} variant="ghost" onPress={remove} style={{ marginTop: 10 }} /> : null}
    </View>
  );
}
