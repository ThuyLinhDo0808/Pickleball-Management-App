import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMode } from '../context/ModeContext';
import { supabase } from '../services/supabase';
import { colors } from '../theme';
import { T } from '../components/ui';

export default function ModeSwitcherScreen({ email }) {
  const { setMode } = useMode();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.center}>
        <T bold size={28} style={{ textAlign: 'center' }}>Pickleball Host</T>
        <T muted style={{ textAlign: 'center', marginBottom: 32 }}>Choose your workspace</T>

        <Pressable style={[styles.card, { backgroundColor: '#1D4ED8' }]} onPress={() => setMode('club')}>
          <T bold size={20} style={{ marginBottom: 6 }}>🏓 Club Manager</T>
          <T size={13} style={{ color: '#E2E8F0' }}>Members, matches, rankings and the monthly fund</T>
        </Pressable>

        <Pressable style={[styles.card, { backgroundColor: '#059669' }]} onPress={() => setMode('event')}>
          <T bold size={20} style={{ marginBottom: 6 }}>📅 Xé Vé Manager</T>
          <T size={13} style={{ color: '#E2E8F0' }}>One-off events, waitlist, check-in and profit per event</T>
        </Pressable>
      </View>

      <View style={styles.footer}>
        {email ? <T muted size={12} style={{ marginBottom: 8 }}>Signed in as {email}</T> : null}
        <Pressable onPress={() => supabase.auth.signOut()} hitSlop={10}>
          <T style={{ color: colors.primaryLight, fontWeight: '600' }}>Sign out</T>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  center: { flex: 1, justifyContent: 'center', padding: 24 },
  card: { borderRadius: 16, padding: 24, marginBottom: 16 },
  footer: { alignItems: 'center', paddingBottom: 16 },
});
