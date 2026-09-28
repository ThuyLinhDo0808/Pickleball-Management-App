import React from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { colors } from '../theme';

// Text with the app's default (light) colour; RN's default is black.
export function T({ style, muted, bold, size, children, ...rest }) {
  return (
    <Text
      {...rest}
      style={[{ color: muted ? colors.muted : colors.text }, size ? { fontSize: size } : null, bold ? { fontWeight: '700' } : null, style]}
    >
      {children}
    </Text>
  );
}

export function Card({ style, children, onPress, onLongPress }) {
  if (onPress || onLongPress) {
    return (
      <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [s.card, pressed && { opacity: 0.85 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = 'primary', loading, disabled, small, style }) {
  const bg = { primary: colors.primary, success: colors.event, danger: colors.danger, muted: colors.card2, ghost: 'transparent' }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? <ActivityIndicator color="#fff" /> : <T bold size={small ? 12 : 15} style={{ color: '#fff' }}>{title}</T>}
    </Pressable>
  );
}

export function Field({ label, error, style, ...props }) {
  return (
    <View style={[{ marginBottom: 12 }, style]}>
      {label ? <T muted size={12} style={{ marginBottom: 4 }}>{label}</T> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[s.input, error ? { borderColor: colors.danger } : null]}
      />
      {error ? <T size={12} style={{ color: colors.danger, marginTop: 4 }}>{error}</T> : null}
    </View>
  );
}

export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[s.seg, style]}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, active && s.segActive]}>
            <T size={13} bold={active} style={active ? null : { color: colors.muted }}>{o.label}</T>
          </Pressable>
        );
      })}
    </View>
  );
}

const tones = {
  neutral: [colors.card2, colors.text],
  ok: ['#14532D', '#86EFAC'],
  warn: ['#78350F', '#FCD34D'],
  danger: ['#7F1D1D', '#FCA5A5'],
  info: ['#1E3A8A', '#93C5FD'],
};

export function Chip({ label, tone = 'neutral' }) {
  const [bg, fg] = tones[tone] || tones.neutral;
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function SectionTitle({ children, right }) {
  return (
    <View style={s.sectionRow}>
      <T bold size={16}>{children}</T>
      {right || null}
    </View>
  );
}

export function Empty({ title, subtitle }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
      <T bold size={16} style={{ textAlign: 'center' }}>{title}</T>
      {subtitle ? <T muted style={{ textAlign: 'center', marginTop: 6 }}>{subtitle}</T> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, minHeight: 200 }}>
      <ActivityIndicator size="large" color={colors.primaryLight} />
    </View>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg, minHeight: 200 }}>
      <T bold size={16} style={{ marginBottom: 6 }}>Something went wrong</T>
      <T muted style={{ textAlign: 'center', marginBottom: 16 }}>{error?.message || 'Please try again.'}</T>
      <Button title="Try again" onPress={onRetry} />
    </View>
  );
}

export function FormModal({ visible, title, onClose, children }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalWrap}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={s.sheet}>
          <View style={s.sheetHead}>
            <T bold size={18}>{title}</T>
            <Pressable onPress={onClose} hitSlop={12}>
              <T muted size={18}>✕</T>
            </Pressable>
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 24 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: 12, padding: 14, marginBottom: 10 },
  btn: { borderRadius: 10, paddingVertical: 13, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 8 },
  input: {
    backgroundColor: colors.bg, color: colors.text, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 12, paddingHorizontal: 12, fontSize: 16,
  },
  seg: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  segItem: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  segActive: { backgroundColor: colors.card2 },
  chip: { paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, alignSelf: 'flex-start' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 8 },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 18, maxHeight: '88%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
});
