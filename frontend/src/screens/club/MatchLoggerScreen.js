import React, { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { useI18n } from '../../i18n';
import { showError } from '../../utils/errors';
import { formatDateTime } from '../../utils/format';
import { toast } from '../../components/Toast';
import { colors } from '../../theme';
import { T, Card, Button, Field, Segmented, Pill, EmptyState, ErrorState, Loading, SectionHeader } from '../../components/ui';

export default function MatchLoggerScreen({ route, navigation }) {
  const { clubId } = route.params;
  const { t } = useI18n();
  const { data, error, loading, refreshing, refresh, reload, retry } = useLoad(async () => {
    const [m, mt] = await Promise.all([
      api.get(`/api/clubs/${clubId}/members`),
      api.get(`/api/matches?club_id=${clubId}`),
    ]);
    return { members: m.members, matches: mt.matches };
  }, [clubId]);

  const [matchType, setMatchType] = useState('doubles');
  const [team1, setTeam1] = useState([]);
  const [team2, setTeam2] = useState([]);
  const [s1, setS1] = useState('');
  const [s2, setS2] = useState('');
  const [saving, setSaving] = useState(false);

  const need = matchType === 'singles' ? 1 : 2;
  const active = useMemo(() => (data?.members || []).filter((m) => m.status === 'active'), [data]);
  const nameOf = useMemo(() => {
    const map = {};
    (data?.members || []).forEach((m) => { map[m.id] = m.display_name; });
    return map;
  }, [data]);

  if (loading) return <Loading />;
  if (error && !data) return <ErrorState error={error} onRetry={retry} />;

  function changeType(next) {
    const n = next === 'singles' ? 1 : 2;
    setMatchType(next);
    setTeam1((x) => x.slice(0, n));
    setTeam2((x) => x.slice(0, n));
  }

  function toggle(team, id) {
    const [mine, setMine, other] = team === 1 ? [team1, setTeam1, team2] : [team2, setTeam2, team1];
    if (other.includes(id)) return;
    if (mine.includes(id)) setMine(mine.filter((x) => x !== id));
    else if (mine.length < need) setMine([...mine, id]);
  }

  async function submit() {
    const a = Number(s1);
    const b = Number(s2);
    if (team1.length !== need || team2.length !== need) return Alert.alert(t('match.pickPlayers'), t('match.needPlayers', { n: need }));
    if (s1 === '' || s2 === '' || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) return Alert.alert(t('match.invalidScore'), t('match.scoreWhole'));
    if (a === b) return Alert.alert(t('match.invalidScore'), t('match.noTie'));

    try {
      setSaving(true);
      await api.post('/api/matches', {
        club_id: clubId, match_type: matchType, team1_score: a, team2_score: b,
        team1_player_ids: team1, team2_player_ids: team2,
      });
      setTeam1([]); setTeam2([]); setS1(''); setS2('');
      toast(t('match.saved'));
      reload();
    } catch (e) {
      showError(t('match.saveFailed'), e, navigation);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(match) {
    Alert.alert(t('match.deleteTitle'), t('match.deleteBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: async () => {
          try { await api.del(`/api/matches/${match.id}`); toast(t('match.deleted')); reload(); }
          catch (e) { showError(t('match.deleteFailed'), e, navigation); }
        },
      },
    ]);
  }

  const teamNames = (match, team) =>
    match.match_players.filter((p) => p.team === team).map((p) => nameOf[p.club_member_id] || '?').join(' & ');

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
    >
      <T bold size={20} style={{ marginBottom: 12 }}>{t('match.logTitle')}</T>

      <Segmented
        value={matchType}
        onChange={changeType}
        options={[{ value: 'singles', label: t('match.singles') }, { value: 'doubles', label: t('match.doubles') }, { value: 'mixed', label: t('match.mixed') }]}
      />

      {active.length < need * 2 ? (
        <EmptyState icon="person-add-outline" title={t('match.needMembers')} subtitle={t('match.needMembersBody', { n: need * 2 })} />
      ) : (
        <>
          <TeamPicker title={`${t('match.team1')} (${team1.length}/${need})`} members={active} selected={team1} blocked={team2} onToggle={(id) => toggle(1, id)} />
          <TeamPicker title={`${t('match.team2')} (${team2.length}/${need})`} members={active} selected={team2} blocked={team1} onToggle={(id) => toggle(2, id)} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12, marginTop: 4 }}>
            <Field style={{ flex: 1, marginBottom: 0 }} label={t('match.team1Score')} value={s1} onChangeText={setS1} keyboardType="number-pad" placeholder="0" />
            <T muted size={22} style={{ marginBottom: 12 }}>–</T>
            <Field style={{ flex: 1, marginBottom: 0 }} label={t('match.team2Score')} value={s2} onChangeText={setS2} keyboardType="number-pad" placeholder="0" />
          </View>
          <Button title={t('match.save')} icon="checkmark" onPress={submit} loading={saving} style={{ marginTop: 16 }} />
        </>
      )}

      <SectionHeader title={t('match.recent')} />
      {(data?.matches || []).length === 0 ? (
        <EmptyState icon="tennisball-outline" title={t('match.emptyTitle')} subtitle={t('match.emptyBody')} />
      ) : (
        <>
          <T muted size={12} style={{ marginBottom: 8 }}>{t('match.deleteHint')}</T>
          {data.matches.map((m) => (
            <Card key={m.id} onLongPress={() => confirmDelete(m)}>
              {[1, 2].map((team) => {
                const won = m.winner_team === team;
                return (
                  <View key={team} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
                    <T bold={won} style={[{ flex: 1, paddingRight: 8 }, won ? { color: colors.accent } : null]}>{teamNames(m, team)}</T>
                    <T bold={won} style={won ? { color: colors.accent } : null}>{team === 1 ? m.team1_score : m.team2_score}</T>
                  </View>
                );
              })}
              <T muted size={11} style={{ marginTop: 6 }}>{t(`match.${m.match_type}`)} · {formatDateTime(m.played_at)}</T>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}

function TeamPicker({ title, members, selected, blocked, onToggle }) {
  return (
    <Card>
      <T bold style={{ color: colors.accent, marginBottom: 10 }}>{title}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {members.map((m) => {
          const off = blocked.includes(m.id);
          return (
            <View key={m.id} style={{ opacity: off ? 0.3 : 1 }} pointerEvents={off ? 'none' : 'auto'}>
              <Pill label={m.display_name} active={selected.includes(m.id)} onPress={() => onToggle(m.id)} />
            </View>
          );
        })}
      </View>
    </Card>
  );
}
