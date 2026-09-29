import React from 'react';
import { View, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../services/api';
import { supabase } from '../services/supabase';
import { useLoad } from '../hooks/useLoad';
import { useMode } from '../context/ModeContext';
import { useI18n, LANGS } from '../i18n';
import { colors } from '../theme';
import { T, Card, Button, Avatar, Segmented, SectionHeader } from '../components/ui';
import CapacityBanner from '../components/CapacityBanner';

const APP_VERSION = '1.1.0';

export default function AccountScreen({ navigation }) {
  const { t, lang, setLanguage } = useI18n();
  const { mode, setMode } = useMode();
  const { data } = useLoad(() => api.get('/api/host/me'), []);
  const user = data?.user;

  function confirmSignOut() {
    Alert.alert(t('account.signOut'), t('account.signOutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('account.signOut'), style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  const other = mode === 'club' ? 'event' : 'club';

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar name={user?.full_name || user?.email} size={56} />
        <View style={{ flex: 1 }}>
          <T bold size={18} numberOfLines={1}>{user?.full_name || '—'}</T>
          <T muted numberOfLines={1}>{user?.email}</T>
        </View>
      </Card>

      <CapacityBanner />

      <SectionHeader title={t('account.language')} />
      <Segmented
        value={lang}
        onChange={setLanguage}
        options={LANGS.map((l) => ({ value: l.code, label: l.label }))}
      />

      <SectionHeader title={t('account.workspace')} />
      <Card style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
          <Ionicons name={mode === 'club' ? 'people' : 'calendar'} size={20} color={colors.accent} />
          <T bold>{mode === 'club' ? t('ws.clubFull') : t('ws.eventFull')}</T>
        </View>
        <Button small variant="secondary" title={t('account.switchTo', { name: other === 'club' ? t('ws.club') : t('ws.event') })} onPress={() => setMode(other)} />
      </Card>

      <Button title={t('account.signOut')} variant="ghost" icon="log-out-outline" onPress={confirmSignOut} style={{ marginTop: 24 }} />
      <T muted size={11} style={{ textAlign: 'center', marginTop: 16 }}>{t('app.name')} · v{APP_VERSION}</T>
    </ScrollView>
  );
}
