import React, { useState } from 'react';
import { FlatList, RefreshControl, View, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { showError } from '../../utils/errors';
import { parseMoney, formatMoney } from '../../utils/format';
import { colors } from '../../theme';
import { T, Card, Button, Field, Empty, ErrorState, Loading } from '../../components/ui';
import CapacityBanner from '../../components/CapacityBanner';

export default function ClubListScreen({ navigation }) {
  const { data, error, loading, refreshing, refresh, retry } = useLoad(() => api.get('/api/clubs'), []);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [fee, setFee] = useState('');
  const [saving, setSaving] = useState(false);

  async function createClub() {
    if (!name.trim()) return Alert.alert('Name required', 'Give your club a name.');
    try {
      setSaving(true);
      const { club } = await api.post('/api/clubs', { name: name.trim(), monthly_fee_default: parseMoney(fee) });
      setName('');
      setFee('');
      setShowForm(false);
      navigation.navigate('ClubHome', { clubId: club.id, clubName: club.name });
    } catch (e) {
      showError('Could not create club', e, navigation);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  const clubs = data?.clubs || [];

  const header = (
    <View>
      <CapacityBanner />
      {showForm ? (
        <Card>
          <T bold size={16} style={{ marginBottom: 12 }}>New club</T>
          <Field label="Club name" value={name} onChangeText={setName} placeholder="e.g. Sunday Smashers" autoFocus />
          <Field
            label="Default monthly fee (₫)"
            value={fee}
            onChangeText={setFee}
            keyboardType="number-pad"
            placeholder="e.g. 200000"
          />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button title="Cancel" variant="ghost" onPress={() => setShowForm(false)} style={{ flex: 1 }} />
            <Button title="Create club" onPress={createClub} loading={saving} style={{ flex: 1 }} />
          </View>
        </Card>
      ) : (
        <Button title="+ New club" onPress={() => setShowForm(true)} style={{ marginBottom: 12 }} />
      )}
    </View>
  );

  return (
    <FlatList
      data={clubs}
      keyExtractor={(c) => c.id}
      contentContainerStyle={{ padding: 16 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
      ListHeaderComponent={header}
      ListEmptyComponent={
        <Empty title="No clubs yet" subtitle="Create your first club to start adding members, logging matches and tracking the fund." />
      }
      renderItem={({ item }) => (
        <Card onPress={() => navigation.navigate('ClubHome', { clubId: item.id, clubName: item.name })}>
          <T bold size={17}>{item.name}</T>
          <T muted size={13} style={{ marginTop: 4 }}>
            Monthly fee {formatMoney(item.monthly_fee_default)}
          </T>
        </Card>
      )}
    />
  );
}
