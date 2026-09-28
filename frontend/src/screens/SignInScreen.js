import React, { useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';

export default function SignInScreen() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }

  async function submit() {
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      return setMessage({ type: 'error', text: 'Enter your email and password.' });
    }
    if (password.length < 6) {
      return setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: fullName.trim() || cleanEmail.split('@')[0] } },
        });
        if (error) throw error;
        // If "Confirm email" is enabled in Supabase, there's no session yet.
        if (!data.session) {
          setMessage({ type: 'info', text: 'Account created. Check your email to confirm, then sign in.' });
          setIsSignUp(false);
        }
        // With confirmation disabled, onAuthStateChange in App.js logs you in automatically.
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0F172A' }}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Text style={styles.title}>{isSignUp ? 'Create account' : 'Sign in'}</Text>

      {isSignUp && (
        <TextInput
          style={styles.input}
          placeholder="Full name"
          placeholderTextColor="#64748B"
          value={fullName}
          onChangeText={setFullName}
        />
      )}
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#64748B"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#64748B"
        secureTextEntry
        autoCapitalize="none"
        value={password}
        onChangeText={setPassword}
        onSubmitEditing={submit}
      />

      {message && (
        <Text style={[styles.message, message.type === 'error' ? styles.error : styles.info]}>
          {message.text}
        </Text>
      )}

      <Pressable style={styles.button} onPress={submit} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.buttonText}>{isSignUp ? 'Sign up' : 'Sign in'}</Text>}
      </Pressable>

      <Pressable onPress={() => { setIsSignUp(!isSignUp); setMessage(null); }}>
        <Text style={styles.toggle}>
          {isSignUp ? 'Already have an account? Sign in' : "New here? Create an account"}
        </Text>
      </Pressable>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0F172A' },
  title: { color: '#fff', fontSize: 28, fontWeight: '700', textAlign: 'center', marginBottom: 24 },
  input: {
    backgroundColor: '#1E293B', color: '#fff', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 14, marginBottom: 12, fontSize: 16,
  },
  button: { backgroundColor: '#2563EB', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  toggle: { color: '#60A5FA', textAlign: 'center', marginTop: 18, fontWeight: '600' },
  message: { textAlign: 'center', marginBottom: 8 },
  error: { color: '#F87171' },
  info: { color: '#86EFAC' },
});
