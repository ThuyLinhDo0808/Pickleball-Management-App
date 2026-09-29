import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMode } from '../context/ModeContext';
import { useI18n } from '../i18n';
import { colors, radius } from '../theme';

// Pill in the header of each workspace's home screens: jump between Club Manager and Xé Vé.
export default function WorkspaceSwitch() {
  const { mode, setMode } = useMode();
  const { t } = useI18n();
  const items = [
    { key: 'club', label: t('ws.club'), icon: 'people' },
    { key: 'event', label: t('ws.event'), icon: 'calendar' },
  ];
  return (
    <View style={{ flexDirection: 'row', backgroundColor: colors.bg, borderRadius: radius.pill, padding: 3, borderWidth: 1, borderColor: colors.border }}>
      {items.map((it) => {
        const active = mode === it.key;
        return (
          <Pressable
            key={it.key}
            onPress={() => !active && setMode(it.key)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 14,
              borderRadius: radius.pill, backgroundColor: active ? colors.accent : 'transparent',
            }}
          >
            <Ionicons name={it.icon} size={14} color={active ? colors.onAccent : colors.muted} />
            <Text style={{ color: active ? colors.onAccent : colors.muted, fontWeight: '800', fontSize: 13 }}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
