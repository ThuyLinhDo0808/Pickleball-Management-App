import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { supabase } from './src/services/supabase';
import { ModeProvider, useMode } from './src/context/ModeContext';
import { colors, navTheme } from './src/theme';
import SignInScreen from './src/screens/SignInScreen';
import ModeSwitcherScreen from './src/screens/ModeSwitcherScreen';
import ClubNavigator from './src/navigation/ClubNavigator';
import EventNavigator from './src/navigation/EventNavigator';

// Shows the sign-in screen until there is a Supabase session, then the app.
function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }
  if (!session) return <SignInScreen />;
  return children(session);
}

// The workspace switch: `key={mode}` throws away the whole navigation tree when
// the mode changes, so Club Manager and Xé Vé Manager never share screen state.
function Root({ session }) {
  const { mode } = useMode();
  if (!mode) return <ModeSwitcherScreen email={session.user?.email} />;
  return (
    <NavigationContainer key={mode} theme={navTheme}>
      {mode === 'club' ? <ClubNavigator /> : <EventNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <ModeProvider>
        <AuthGate>{(session) => <Root session={session} />}</AuthGate>
      </ModeProvider>
    </SafeAreaProvider>
  );
}
