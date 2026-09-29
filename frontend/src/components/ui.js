import React from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator,
  Modal, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { t } from '../i18n/core.js';
import { errorMessage } from '../utils/errors';
import { groupDigits } from '../utils/format';

// ---- text ------------------------------------------------------------------
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

// ---- surfaces --------------------------------------------------------------
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

// ---- buttons ---------------------------------------------------------------
export function Button({ title, onPress, variant = 'primary', icon, loading, disabled, small, style }) {
  const palette = {
    primary: { bg: colors.accent, fg: colors.onAccent },
    secondary: { bg: colors.card2, fg: colors.text },
    danger: { bg: colors.danger, fg: '#fff' },
    ghost: { bg: 'transparent', fg: colors.text },
  }[variant];
  const off = disabled || loading;
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSmall,
        { backgroundColor: palette.bg, opacity: off ? 0.5 : pressed ? 0.85 : 1 },
        variant === 'ghost' && { borderWidth: 1, borderColor: colors.border },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon ? <Ionicons name={icon} size={small ? 14 : 18} color={palette.fg} /> : null}
          <Text style={{ color: palette.fg, fontWeight: '700', fontSize: small ? 12 : 15 }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ name, onPress, color = colors.text, size = 22, style }) {
  return (
    <Pressable onPress={onPress} hitSlop={10} style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1, padding: 4 }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Fab({ icon = 'add', label, onPress, style }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [s.fab, label ? { paddingHorizontal: 18 } : { width: 56 }, pressed && { opacity: 0.85 }, style]}
    >
      <Ionicons name={icon} size={24} color={colors.onAccent} />
      {label ? <Text style={{ color: colors.onAccent, fontWeight: '800', marginLeft: 6 }}>{label}</Text> : null}
    </Pressable>
  );
}

// ---- inputs ----------------------------------------------------------------
export function Field({ label, error, hint, style, ...props }) {
  return (
    <View style={[{ marginBottom: 14 }, style]}>
      {label ? <T muted size={12} bold style={{ marginBottom: 6 }}>{label}</T> : null}
      <TextInput
        placeholderTextColor={colors.muted}
        {...props}
        style={[s.input, props.multiline && { minHeight: 80, textAlignVertical: 'top' }, error ? { borderColor: colors.danger } : null]}
      />
      {error ? <T size={12} style={{ color: colors.danger, marginTop: 4 }}>{error}</T> : null}
      {!error && hint ? <T muted size={11} style={{ marginTop: 4 }}>{hint}</T> : null}
    </View>
  );
}

// Money input that shows thousands separators as you type: 1500000 -> 1.500.000
export function MoneyField({ onChangeText, ...props }) {
  return <Field keyboardType="number-pad" {...props} onChangeText={(v) => onChangeText(groupDigits(v))} />;
}

export function Segmented({ options, value, onChange, style }) {
  return (
    <View style={[s.seg, style]}>
      {options.map((o) => {
        const active = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={[s.segItem, active && s.segActive]}>
            <Text style={{ color: active ? colors.onAccent : colors.muted, fontWeight: active ? '800' : '600', fontSize: 13 }} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Selectable pill (filters, club picker, ...)
export function Pill({ label, active, onPress, icon }) {
  return (
    <Pressable onPress={onPress} style={[s.pill, active && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
      {icon ? <Ionicons name={icon} size={14} color={active ? colors.onAccent : colors.muted} style={{ marginRight: 4 }} /> : null}
      <Text style={{ color: active ? colors.onAccent : colors.text, fontWeight: '600', fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

export function Checkbox({ checked, disabled }) {
  return (
    <View style={[s.checkbox, checked && { backgroundColor: colors.accent, borderColor: colors.accent }, disabled && { opacity: 0.4 }]}>
      {checked ? <Ionicons name="checkmark" size={16} color={colors.onAccent} /> : null}
    </View>
  );
}

// ---- small pieces ----------------------------------------------------------
const tones = {
  neutral: [colors.card2, colors.text],
  ok: ['#14532D', '#86EFAC'],
  warn: ['#78350F', '#FCD34D'],
  danger: ['#7F1D1D', '#FCA5A5'],
  info: ['#1E3A8A', '#93C5FD'],
  accent: ['#3F5212', '#D9F99D'],
};

export function Chip({ label, tone = 'neutral', icon }) {
  const [bg, fg] = tones[tone] || tones.neutral;
  return (
    <View style={[s.chip, { backgroundColor: bg }]}>
      {icon ? <Ionicons name={icon} size={11} color={fg} style={{ marginRight: 3 }} /> : null}
      <Text style={{ color: fg, fontSize: 11, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

const AVATAR_COLORS = ['#F97316', '#EAB308', '#22C55E', '#14B8A6', '#3B82F6', '#8B5CF6', '#EC4899', '#EF4444'];
function initials(name) {
  const parts = String(name || '?').trim().split(/\s+/);
  const first = parts[0]?.[0] || '?';
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
}
export function Avatar({ name, size = 40, style }) {
  let h = 0;
  const str = String(name || '');
  for (let i = 0; i < str.length; i += 1) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: AVATAR_COLORS[h % AVATAR_COLORS.length], alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ color: '#fff', fontWeight: '800', fontSize: size * 0.4 }}>{initials(name)}</Text>
    </View>
  );
}

export function ProgressBar({ value, max, color = colors.accent, style }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <View style={[{ height: 6, borderRadius: 3, backgroundColor: colors.bg, overflow: 'hidden' }, style]}>
      <View style={{ width: `${pct}%`, height: 6, backgroundColor: color }} />
    </View>
  );
}

export function SectionHeader({ title, right, style }) {
  return (
    <View style={[s.sectionRow, style]}>
      <T bold size={16}>{title}</T>
      {right || null}
    </View>
  );
}

// ---- states ----------------------------------------------------------------
export function EmptyState({ icon = 'albums-outline', title, subtitle, action }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24 }}>
      <View style={s.emptyIcon}>
        <Ionicons name={icon} size={30} color={colors.muted} />
      </View>
      <T bold size={16} style={{ textAlign: 'center' }}>{title}</T>
      {subtitle ? <T muted style={{ textAlign: 'center', marginTop: 6 }}>{subtitle}</T> : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}

export function Loading() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg, minHeight: 200 }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.bg, minHeight: 200 }}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.muted} />
      <T bold size={16} style={{ marginTop: 12, marginBottom: 6 }}>{t('common.errorTitle')}</T>
      <T muted style={{ textAlign: 'center', marginBottom: 16 }}>{errorMessage(error)}</T>
      <Button title={t('common.retry')} onPress={onRetry} />
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
            <IconButton name="close" color={colors.muted} onPress={onClose} />
          </View>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 28 }}>
            {children}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export const s = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  btn: { borderRadius: radius.md, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  btnSmall: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: radius.sm },
  input: {
    backgroundColor: colors.bg, color: colors.text, borderRadius: radius.md, borderWidth: 1,
    borderColor: colors.border, paddingVertical: 13, paddingHorizontal: 14, fontSize: 16,
  },
  seg: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.md, padding: 3, borderWidth: 1, borderColor: colors.border, marginBottom: 12 },
  segItem: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: radius.sm + 1 },
  segActive: { backgroundColor: colors.accent },
  pill: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill, alignSelf: 'flex-start' },
  sectionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 10 },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  fab: {
    position: 'absolute', right: 16, bottom: 16, height: 56, borderRadius: 28, backgroundColor: colors.accent,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  modalWrap: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, maxHeight: '90%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
});
