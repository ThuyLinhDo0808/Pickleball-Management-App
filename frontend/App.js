import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { supabase } from './src/services/supabase';
import { ModeProvider, useMode } from './src/context/ModeContext';
import { I18nProvider } from './src/i18n';
import { ToastHost } from './src/components/Toast';
import { colors, navTheme } from './src/theme';
import SignInScreen from './src/screens/SignInScreen';
import WelcomeScreen from './src/screens/WelcomeScreen';
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
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }
  if (!session) return <SignInScreen />;
  return children(session);
}

// The workspace switch: `key={mode}` throws away the whole navigation tree when the
// mode changes, so Club Manager and Xé Vé Manager never share screen/navigation state.
// The chosen workspace is remembered (ModeContext persists it), so returning hosts skip
// the welcome screen and land straight back where they left off.
function Root({ session }) {
  const { mode, ready } = useMode();
  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  if (!mode) return <WelcomeScreen email={session.user?.email} />;
  return (
    <NavigationContainer key={mode} theme={navTheme}>
      {mode === 'club' ? <ClubNavigator /> : <EventNavigator />}
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <I18nProvider>
        <StatusBar style="light" />
        <ModeProvider>
          <AuthGate>{(session) => <Root session={session} />}</AuthGate>
          <ToastHost />
        </ModeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
