import { DarkTheme } from '@react-navigation/native';

export const colors = {
  bg: '#0F172A',
  card: '#1E293B',
  card2: '#334155',
  border: '#334155',
  text: '#F8FAFC',
  muted: '#94A3B8',
  primary: '#2563EB',
  primaryLight: '#60A5FA',
  event: '#059669',
  eventLight: '#34D399',
  danger: '#DC2626',
  warn: '#D97706',
  ok: '#22C55E',
};

export const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.bg,
    card: colors.card,
    text: colors.text,
    border: colors.border,
    primary: colors.primaryLight,
  },
};

export const stackOptions = {
  headerStyle: { backgroundColor: colors.card },
  headerTintColor: colors.text,
  headerTitleStyle: { fontWeight: '700' },
  contentStyle: { backgroundColor: colors.bg },
};
