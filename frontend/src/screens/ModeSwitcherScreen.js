import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useMode } from '../context/ModeContext';

export default function ModeSwitcherScreen() {
  const { setMode } = useMode();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pickleball Host</Text>
      <Text style={styles.subtitle}>Choose your workspace</Text>

      <Pressable style={[styles.card, styles.clubCard]} onPress={() => setMode('club')}>
        <Text style={styles.cardTitle}>🏓 Club Manager</Text>
        <Text style={styles.cardDesc}>Members, monthly funds, rankings</Text>
      </Pressable>

      <Pressable style={[styles.card, styles.eventCard]} onPress={() => setMode('event')}>
        <Text style={styles.cardTitle}>📅 Xé Vé Manager</Text>
        <Text style={styles.cardDesc}>One-off events, check-in, event P&L</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0F172A' },
  title: { fontSize: 28, fontWeight: '700', color: '#fff', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#94A3B8', textAlign: 'center', marginBottom: 32 },
  card: { borderRadius: 16, padding: 24, marginBottom: 16 },
  clubCard: { backgroundColor: '#1D4ED8' },
  eventCard: { backgroundColor: '#059669' },
  cardTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 6 },
  cardDesc: { fontSize: 13, color: '#E2E8F0' },
});
