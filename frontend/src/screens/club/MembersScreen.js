import React, { useMemo, useState } from 'react';
import { View, FlatList, RefreshControl, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { showError } from '../../utils/errors';
import { colors } from '../../theme';
import { T, Card, Button, Field, Segmented, Chip, Empty, ErrorState, Loading, FormModal } from '../../components/ui';
import CapacityBanner from '../../components/CapacityBanner';

export default function MembersScreen({ route, navigation }) {
  const { clubId } = route.params;
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
        contentContainerStyle={{ padding: 16, paddingBottom: 90 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
        ListHeaderComponent={
          <View>
            <CapacityBanner />
            <T muted style={{ marginBottom: 10 }}>
              {active.length} active · {active.length - guests} fixed · {guests} guest
            </T>
            {members.length > 8 ? (
              <Field value={query} onChangeText={setQuery} placeholder="Search members" autoCorrect={false} />
            ) : null}
          </View>
        }
        ListEmptyComponent={
          <Empty
            title={query ? 'No matches' : 'No members yet'}
            subtitle={query ? 'Try a different name.' : 'Tap "Add member" to build your roster.'}
          />
        }
        renderItem={({ item }) => (
          <Card onPress={() => setEditing(item)} style={{ opacity: item.status === 'inactive' ? 0.6 : 1 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <T bold size={16}>{item.display_name}</T>
                <T muted size={12} style={{ marginTop: 2 }}>
                  {item.dupr_level != null ? `DUPR ${Number(item.dupr_level).toFixed(2)}` : 'No rating'}
                  {item.phone ? ` · ${item.phone}` : ''}
                </T>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 4 }}>
                <Chip label={item.member_type === 'fixed' ? 'Fixed' : 'Guest'} tone={item.member_type === 'fixed' ? 'info' : 'neutral'} />
                {item.status === 'inactive' ? <Chip label="Inactive" tone="warn" /> : null}
              </View>
            </View>
          </Card>
        )}
      />

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 16 }}>
        <Button title="+ Add member" onPress={() => setEditing('new')} />
      </View>

      <FormModal
        visible={!!editing}
        title={editing === 'new' ? 'Add member' : 'Edit member'}
        onClose={() => setEditing(null)}
      >
        {editing ? (
          <MemberForm
            key={editing === 'new' ? 'new' : editing.id}
            member={editing}
            clubId={clubId}
            navigation={navigation}
            onDone={() => { setEditing(null); reload(); }}
          />
        ) : null}
      </FormModal>
    </View>
  );
}

function MemberForm({ member, clubId, navigation, onDone }) {
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
    if (!name.trim()) e.name = 'Name is required.';
    const rating = dupr.trim() ? Number(dupr.replace(',', '.')) : null;
    if (rating !== null && (!Number.isFinite(rating) || rating < 0 || rating > 9.99)) e.dupr = 'Enter a rating like 3.5 (0 to 9.99).';
    setErrors(e);
    if (Object.keys(e).length) return;

    const payload = { display_name: name.trim(), phone: phone.trim() || null, dupr_level: rating, member_type: type };
    if (!isNew) payload.status = status;
    try {
      setSaving(true);
      if (isNew) await api.post(`/api/clubs/${clubId}/members`, payload);
      else await api.patch(`/api/clubs/${clubId}/members/${member.id}`, payload);
      onDone();
    } catch (err) {
      showError('Could not save member', err, navigation);
    } finally {
      setSaving(false);
    }
  }

  function remove() {
    Alert.alert('Remove member?', `${member.display_name} will be removed from the roster. Their past matches and rankings are kept.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove', style: 'destructive',
        onPress: async () => {
          try {
            await api.patch(`/api/clubs/${clubId}/members/${member.id}`, { status: 'removed' });
            onDone();
          } catch (err) {
            showError('Could not remove member', err, navigation);
          }
        },
      },
    ]);
  }

  return (
    <View>
      <Field label="Name" value={name} onChangeText={setName} error={errors.name} placeholder="Full name" autoFocus={isNew} />
      <Field label="Phone (optional)" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <Field label="DUPR / level (optional)" value={dupr} onChangeText={setDupr} error={errors.dupr} keyboardType="decimal-pad" placeholder="e.g. 3.50" />
      <T muted size={12} style={{ marginBottom: 4 }}>Member type</T>
      <Segmented value={type} onChange={setType} options={[{ value: 'fixed', label: 'Fixed' }, { value: 'guest', label: 'Guest' }]} />
      {!isNew ? (
        <>
          <T muted size={12} style={{ marginBottom: 4 }}>Status</T>
          <Segmented
            value={status}
            onChange={setStatus}
            options={[{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }]}
          />
        </>
      ) : null}
      <Button title={isNew ? 'Add member' : 'Save changes'} onPress={save} loading={saving} />
      {!isNew ? <Button title="Remove from club" variant="ghost" onPress={remove} style={{ marginTop: 10 }} /> : null}
    </View>
  );
}
