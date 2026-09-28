import React, { useMemo, useState } from 'react';
import { View, ScrollView, RefreshControl, Alert } from 'react-native';
import { api } from '../../services/api';
import { useLoad } from '../../hooks/useLoad';
import { showError } from '../../utils/errors';
import { formatDateTime } from '../../utils/format';
import { colors } from '../../theme';
import { T, Card, Button, Field, Segmented, Empty, ErrorState, Loading, SectionTitle } from '../../components/ui';
import { Pressable } from 'react-native';

export default function MatchLoggerScreen({ route, navigation }) {
  const { clubId } = route.params;
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

  function changeType(t) {
    const n = t === 'singles' ? 1 : 2;
    setMatchType(t);
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
    if (team1.length !== need || team2.length !== need) {
      return Alert.alert('Pick the players', `${matchType === 'singles' ? 'Singles' : 'Doubles'} needs ${need} player${need > 1 ? 's' : ''} per team.`);
    }
    if (s1 === '' || s2 === '' || !Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      return Alert.alert('Invalid score', 'Enter a whole-number score for both teams.');
    }
    if (a === b) return Alert.alert('Invalid score', 'A match cannot end in a tie.');

    try {
      setSaving(true);
      await api.post('/api/matches', {
        club_id: clubId, match_type: matchType,
        team1_score: a, team2_score: b,
        team1_player_ids: team1, team2_player_ids: team2,
      });
      setTeam1([]); setTeam2([]); setS1(''); setS2('');
      reload();
    } catch (e) {
      showError('Could not save match', e, navigation);
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete(match) {
    Alert.alert('Delete this match?', 'It will be removed from rankings and win rates.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try { await api.del(`/api/matches/${match.id}`); reload(); }
          catch (e) { showError('Could not delete match', e, navigation); }
        },
      },
    ]);
  }

  const teamNames = (match, team) =>
    match.match_players.filter((p) => p.team === team).map((p) => nameOf[p.club_member_id] || 'Unknown').join(' & ');

  return (
    <ScrollView
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.muted} />}
    >
      <T bold size={20} style={{ marginBottom: 12 }}>Log a match</T>

      <Segmented
        value={matchType}
        onChange={changeType}
        options={[{ value: 'singles', label: 'Singles' }, { value: 'doubles', label: 'Doubles' }, { value: 'mixed', label: 'Mixed' }]}
      />

      {active.length < need * 2 ? (
        <Empty title="Add more members first" subtitle={`You need at least ${need * 2} active members to log a ${matchType} match.`} />
      ) : (
        <>
          <TeamPicker title={`Team 1 (${team1.length}/${need})`} members={active} selected={team1} blocked={team2} onToggle={(id) => toggle(1, id)} />
          <TeamPicker title={`Team 2 (${team2.length}/${need})`} members={active} selected={team2} blocked={team1} onToggle={(id) => toggle(2, id)} />

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
            <Field style={{ flex: 1, marginBottom: 0 }} label="Team 1 score" value={s1} onChangeText={setS1} keyboardType="number-pad" placeholder="0" />
            <T muted size={20} style={{ marginTop: 18 }}>–</T>
            <Field style={{ flex: 1, marginBottom: 0 }} label="Team 2 score" value={s2} onChangeText={setS2} keyboardType="number-pad" placeholder="0" />
          </View>
          <Button title="Save match" onPress={submit} loading={saving} style={{ marginTop: 14 }} />
        </>
      )}

      <SectionTitle>Recent matches</SectionTitle>
      {(data?.matches || []).length === 0 ? (
        <Empty title="No matches yet" subtitle="Saved matches appear here and feed the rankings." />
      ) : (
        <>
          <T muted size={12} style={{ marginBottom: 8 }}>Long-press a match to delete it.</T>
          {data.matches.map((m) => (
            <Card key={m.id} onLongPress={() => confirmDelete(m)}>
              {[1, 2].map((team) => {
                const won = m.winner_team === team;
                return (
                  <View key={team} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
                    <T bold={won} style={[{ flex: 1, paddingRight: 8 }, won ? { color: colors.ok } : null]}>{teamNames(m, team)}</T>
                    <T bold={won} style={won ? { color: colors.ok } : null}>{team === 1 ? m.team1_score : m.team2_score}</T>
                  </View>
                );
              })}
              <T muted size={11} style={{ marginTop: 6 }}>{m.match_type} · {formatDateTime(m.played_at)}</T>
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
      <T bold style={{ color: colors.primaryLight, marginBottom: 8 }}>{title}</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {members.map((m) => {
          const on = selected.includes(m.id);
          const off = blocked.includes(m.id);
          return (
            <Pressable
              key={m.id}
              onPress={() => onToggle(m.id)}
              disabled={off}
              style={{
                paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999,
                backgroundColor: on ? colors.primary : colors.card2, opacity: off ? 0.3 : 1,
              }}
            >
              <T size={13} bold={on}>{m.display_name}</T>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
