import React, { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { T, Button, FormModal } from './ui';
import { useI18n } from '../i18n';
import { formatDate, pad2 } from '../utils/format';

// Native pickers behind a tappable field. Values stay plain strings the API already
// understands: dates as 'YYYY-MM-DD', times as 'HH:MM'.

const parseDate = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, m - 1, d);
};
const toISO = (dt) => `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
const parseTime = (hhmm, fallback = '19:00') => {
  const [h, m] = String(hhmm || fallback).split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};
const toHHMM = (dt) => `${pad2(dt.getHours())}:${pad2(dt.getMinutes())}`;

function PickerField({ label, mode, value, onChange, display, error, onClear, placeholder }) {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [temp, setTemp] = useState(new Date());

  const current = mode === 'date' ? (value ? parseDate(value) : new Date()) : parseTime(value);
  const format = mode === 'date' ? toISO : toHHMM;
  const locale = lang === 'vi' ? 'vi-VN' : 'en-US';

  function openPicker() {
    setTemp(current);
    setOpen(true);
  }

  return (
    <View style={{ marginBottom: 14, flex: 1 }}>
      {label ? <T muted size={12} bold style={{ marginBottom: 6 }}>{label}</T> : null}
      <Pressable
        onPress={openPicker}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg,
          borderRadius: radius.md, borderWidth: 1, borderColor: error ? colors.danger : colors.border,
          paddingVertical: 13, paddingHorizontal: 14,
        }}
      >
        <T style={{ fontSize: 16 }} muted={!value}>{value ? display : placeholder || '—'}</T>
        {value && onClear ? (
          <Pressable onPress={onClear} hitSlop={10}><Ionicons name="close-circle" size={18} color={colors.muted} /></Pressable>
        ) : (
          <Ionicons name={mode === 'date' ? 'calendar-outline' : 'time-outline'} size={18} color={colors.muted} />
        )}
      </Pressable>
      {error ? <T size={12} style={{ color: colors.danger, marginTop: 4 }}>{error}</T> : null}

      {open && Platform.OS === 'android' ? (
        <DateTimePicker
          value={current}
          mode={mode}
          is24Hour
          onChange={(event, picked) => {
            setOpen(false);
            if (event.type === 'set' && picked) onChange(format(picked));
          }}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <FormModal visible={open} title={label} onClose={() => setOpen(false)}>
          <DateTimePicker
            value={temp}
            mode={mode}
            display="spinner"
            is24Hour
            themeVariant="dark"
            locale={locale}
            onChange={(_e, picked) => picked && setTemp(picked)}
          />
          <Button title="OK" onPress={() => { onChange(format(temp)); setOpen(false); }} style={{ marginTop: 8 }} />
        </FormModal>
      ) : null}
    </View>
  );
}

export function DateField({ label, value, onChange, error }) {
  return <PickerField label={label} mode="date" value={value} onChange={onChange} display={formatDate(value)} error={error} />;
}

export function TimeField({ label, value, onChange, error, onClear, placeholder }) {
  return <PickerField label={label} mode="time" value={value} onChange={onChange} display={value} error={error} onClear={onClear} placeholder={placeholder} />;
}
