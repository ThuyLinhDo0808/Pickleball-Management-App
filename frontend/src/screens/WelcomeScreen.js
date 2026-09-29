import React from 'react';
import { View, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useMode } from '../context/ModeContext';
import { useI18n, LANGS } from '../i18n';
import { supabase } from '../services/supabase';
import { colors, radius } from '../theme';
import { T, Pill } from '../components/ui';

// Shown once (until a workspace is chosen). After that the app opens straight into the
// last workspace and the switch lives in the header of each home screen.
export default function WelcomeScreen({ email }) {
  const { setMode } = useMode();
  const { t, lang, setLanguage } = useI18n();

  const options = [
    { mode: 'club', icon: 'people', color: '#1D4ED8', title: t('welcome.clubTitle'), desc: t('welcome.clubDesc') },
    { mode: 'event', icon: 'calendar', color: '#047857', title: t('welcome.eventTitle'), desc: t('welcome.eventDesc') },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, padding: 16 }}>
        {LANGS.map((l) => <Pill key={l.code} label={l.label} active={lang === l.code} onPress={() => setLanguage(l.code)} />)}
      </View>

      <View style={{ flex: 1, justifyContent: 'center', padding: 24 }}>
        <T bold size={28} style={{ textAlign: 'center' }}>{t('welcome.title')}</T>
        <T muted style={{ textAlign: 'center', marginBottom: 28, marginTop: 4 }}>{t('welcome.subtitle')}</T>

        {options.map((o) => (
          <Pressable
            key={o.mode}
            onPress={() => setMode(o.mode)}
            style={({ pressed }) => ({ backgroundColor: o.color, borderRadius: radius.lg, padding: 22, marginBottom: 14, opacity: pressed ? 0.9 : 1, flexDirection: 'row', alignItems: 'center', gap: 16 })}
          >
            <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={o.icon} size={26} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <T bold size={19} style={{ marginBottom: 3 }}>{o.title}</T>
              <T size={13} style={{ color: '#E2E8F0' }}>{o.desc}</T>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#fff" />
          </Pressable>
        ))}
      </View>

      <View style={{ alignItems: 'center', paddingBottom: 16 }}>
        {email ? <T muted size={12} style={{ marginBottom: 8 }}>{t('account.signedInAs', { email })}</T> : null}
        <T onPress={() => supabase.auth.signOut()} style={{ color: colors.accent, fontWeight: '700' }}>{t('account.signOut')}</T>
      </View>
    </SafeAreaView>
  );
}
