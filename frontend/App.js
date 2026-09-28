import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { supabase } from './src/services/supabase';
import { ModeProvider, useMode } from './src/context/ModeContext';
import ModeSwitcherScreen from './src/screens/ModeSwitcherScreen';
import MatchLoggerScreen from './src/screens/club/MatchLoggerScreen';
import EventFinanceScreen from './src/screens/event/EventFinanceScreen';

// NOTE: a real build would use @react-navigation/native-stack per-workspace
// (Club Manager stack: Members, Matches, Rankings, Fund; Xe Ve stack:
// Events, Registration, Check-in, Finance). This entry point shows the
// isolation boundary the brief asks for — swapping `mode` swaps the entire
// navigator, not just a screen — with one representative screen per side.

function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = loading

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#fff" /></View>;
  }
  if (!session) {
    return <SignInScreen />;
  }
  return children;
}

// Minimal magic-link sign-in — swap for your preferred Supabase Auth flow
// (password, OTP, OAuth) once wiring up the real screens.
function SignInScreen() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);

  async function sendLink() {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (!error) setSent(true);
  }

  return (
    <View style={styles.center}>
      <Text style={styles.signInTitle}>Sign in</Text>
      {sent ? (
        <Text style={styles.signInText}>Check your email for a login link.</Text>
      ) : (
        <>
          <Text style={styles.signInText}>Magic-link sign-in goes here.</Text>
          <Pressable style={styles.signInButton} onPress={sendLink}>
            <Text style={styles.signInButtonText}>Send Link</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

function Workspace() {
  const { mode, setMode } = useMode();

  if (!mode) return <ModeSwitcherScreen />;

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.modeBar}>
        <Text style={styles.modeBarText}>{mode === 'club' ? 'Club Manager' : 'Xé Vé Manager'}</Text>
        <Pressable onPress={() => setMode(null)}>
          <Text style={styles.switchLink}>Switch workspace</Text>
        </Pressable>
      </View>

      {/* Replace these hardcoded ids with real selection screens
          (pick a club / pick an event) in the full build. */}
      {mode === 'club'
        ? <MatchLoggerScreen clubId="REPLACE_WITH_SELECTED_CLUB_ID" />
        : <EventFinanceScreen eventId="REPLACE_WITH_SELECTED_EVENT_ID" />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
        <AuthGate>
          <ModeProvider>
            <Workspace />
          </ModeProvider>
        </AuthGate>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', padding: 24 },
  signInTitle: { color: '#fff', fontSize: 24, fontWeight: '700', marginBottom: 12 },
  signInText: { color: '#94A3B8', marginBottom: 16, textAlign: 'center' },
  signInButton: { backgroundColor: '#2563EB', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24 },
  signInButtonText: { color: '#fff', fontWeight: '700' },
  modeBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, backgroundColor: '#1E293B',
  },
  modeBarText: { color: '#fff', fontWeight: '700' },
  switchLink: { color: '#60A5FA', fontWeight: '600', fontSize: 12 },
});
