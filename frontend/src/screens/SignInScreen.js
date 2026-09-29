import React, { useState } from 'react';
import { View, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../services/supabase';
import { useI18n, LANGS } from '../i18n';
import { colors } from '../theme';
import { T, Button, Field, Pill } from '../components/ui';

export default function SignInScreen() {
  const { t, lang, setLanguage } = useI18n();
  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }

  async function submit() {
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) return setMessage({ type: 'error', text: t('auth.needEmailPassword') });
    if (password.length < 6) return setMessage({ type: 'error', text: t('auth.passwordShort') });

    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { data: { full_name: fullName.trim() || cleanEmail.split('@')[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          // "Confirm email" is enabled in Supabase: no session until the link is clicked.
          setMessage({ type: 'info', text: t('auth.checkEmail') });
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) throw error;
      }
    } catch (err) {
      setMessage({ type: 'error', text: err?.message || t('err.generic') });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 24 }}>
            {LANGS.map((l) => <Pill key={l.code} label={l.label} active={lang === l.code} onPress={() => setLanguage(l.code)} />)}
          </View>

          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
              <T style={{ fontSize: 42 }}>🏓</T>
            </View>
            <T bold size={26}>{t('app.name')}</T>
            <T muted style={{ marginTop: 4, textAlign: 'center' }}>{t('app.tagline')}</T>
          </View>

          <T bold size={20} style={{ marginBottom: 16 }}>{isSignUp ? t('auth.createAccount') : t('auth.signIn')}</T>

          {isSignUp ? <Field label={t('auth.fullName')} value={fullName} onChangeText={setFullName} /> : null}
          <Field
            label={t('auth.email')} value={email} onChangeText={setEmail}
            autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
          />
          <Field
            label={t('auth.password')} value={password} onChangeText={setPassword}
            secureTextEntry autoCapitalize="none" onSubmitEditing={submit}
          />

          {message ? (
            <T style={{ color: message.type === 'error' ? '#F87171' : '#86EFAC', textAlign: 'center', marginBottom: 12 }}>{message.text}</T>
          ) : null}

          <Button title={isSignUp ? t('auth.signUp') : t('auth.signIn')} onPress={submit} loading={loading} />
          <T
            onPress={() => { setIsSignUp(!isSignUp); setMessage(null); }}
            style={{ color: colors.accent, textAlign: 'center', marginTop: 20, fontWeight: '700' }}
          >
            {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
          </T>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
