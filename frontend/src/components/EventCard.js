import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useI18n } from '../i18n';
import { colors } from '../theme';
import { EVENT_TONE } from '../constants';
import { formatMoney, formatTime, formatDayMonth, dowShortOf } from '../utils/format';
import { T, Card, Chip, ProgressBar } from './ui';

// One event in the schedule / lists (Reclub-style: big start time, capacity bar, fee).
export default function EventCard({ event, onPress, showDate }) {
  const { t } = useI18n();
  const main = Number(event.main_count) || 0;
  const wait = Number(event.waitlist_count) || 0;
  const full = main >= event.max_slots;
  const inactive = event.status === 'cancelled';

  return (
    <Card onPress={onPress} style={{ opacity: inactive ? 0.6 : 1 }}>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 62, alignItems: 'center', justifyContent: 'center', borderRightWidth: 1, borderRightColor: colors.border, marginRight: 12, paddingRight: 12 }}>
          {showDate ? <T muted size={11} bold>{dowShortOf(event.event_date)}</T> : null}
          <T bold size={20}>{formatTime(event.start_time)}</T>
          {showDate ? <T muted size={11}>{formatDayMonth(event.event_date)}</T> : event.end_time ? <T muted size={11}>{formatTime(event.end_time)}</T> : null}
        </View>

        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
            <T bold size={16} numberOfLines={1} style={{ flex: 1 }}>{event.title}</T>
            {event.status !== 'open' ? <Chip label={t(`estatus.${event.status}`)} tone={EVENT_TONE[event.status]} /> : null}
          </View>

          {event.location ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
              <Ionicons name="location-outline" size={13} color={colors.muted} />
              <T muted size={12} numberOfLines={1} style={{ flex: 1 }}>{event.location}</T>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <ProgressBar value={main} max={event.max_slots} color={full ? colors.warn : colors.accent} />
            </View>
            <T size={12} bold>{main}/{event.max_slots}</T>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {event.club_name ? <Chip label={event.club_name} tone="info" icon="people" /> : null}
            {full ? <Chip label={t('event.full')} tone="warn" /> : null}
            {wait > 0 ? <Chip label={t('event.waitlistN', { n: wait })} tone="neutral" /> : null}
            <T muted size={12} style={{ marginLeft: 'auto' }}>
              {Number(event.fee_amount) > 0 ? formatMoney(event.fee_amount) : t('event.free')}
            </T>
          </View>
        </View>
      </View>
    </Card>
  );
}
