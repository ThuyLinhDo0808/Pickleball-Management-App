import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, StyleSheet, Alert, ActivityIndicator,
} from 'react-native';
import { api } from '../../services/api';

// Simple two-team doubles score logger for a single club. In a full build
// clubId would come from route params / a club picker; hardwired here so
// the screen is a runnable, focused example per the brief.
export default function MatchLoggerScreen({ clubId }) {
  const [members, setMembers] = useState([]);
  const [team1, setTeam1] = useState([]); // array of club_member_id
  const [team2, setTeam2] = useState([]);
  const [score1, setScore1] = useState('');
  const [score2, setScore2] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ members }, { matches }] = await Promise.all([
        api.get(`/api/clubs/${clubId}/members`),
        api.get(`/api/matches?club_id=${clubId}`),
      ]);
      setMembers(members);
      setMatches(matches);
    } catch (err) {
      Alert.alert('Could not load club data', err.message);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => { loadData(); }, [loadData]);

  function togglePlayer(team, memberId) {
    const [list, setList] = team === 1 ? [team1, setTeam1] : [team2, setTeam2];
    setList(list.includes(memberId) ? list.filter((id) => id !== memberId) : [...list, memberId]);
  }

  async function submitMatch() {
    const s1 = Number(score1);
    const s2 = Number(score2);

    if (!team1.length || !team2.length) {
      return Alert.alert('Pick players', 'Select at least one player per team.');
    }
    if (team1.some((id) => team2.includes(id))) {
      return Alert.alert('Duplicate player', 'A player can only be on one team.');
    }
    if (Number.isNaN(s1) || Number.isNaN(s2) || s1 === s2) {
      return Alert.alert('Invalid score', 'Enter two different numeric scores.');
    }

    try {
      setSaving(true);
      await api.post('/api/matches', {
        club_id: clubId,
        match_type: team1.length > 1 ? 'doubles' : 'singles',
        team1_score: s1,
        team2_score: s2,
        team1_player_ids: team1,
        team2_player_ids: team2,
      });
      setTeam1([]); setTeam2([]); setScore1(''); setScore2('');
      loadData();
    } catch (err) {
      Alert.alert('Could not save match', err.message);
    } finally {
      setSaving(false);
    }
  }

  const nameFor = (id) => members.find((m) => m.id === id)?.display_name || '—';

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" /></View>;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Log a Match</Text>

      <View style={styles.teamsRow}>
        <TeamPicker title="Team 1" members={members} selected={team1} onToggle={(id) => togglePlayer(1, id)} />
        <TeamPicker title="Team 2" members={members} selected={team2} onToggle={(id) => togglePlayer(2, id)} />
      </View>

      <View style={styles.scoreRow}>
        <TextInput
          style={styles.scoreInput}
          keyboardType="number-pad"
          placeholder="Team 1"
          placeholderTextColor="#94A3B8"
          value={score1}
          onChangeText={setScore1}
        />
        <Text style={styles.dash}>–</Text>
        <TextInput
          style={styles.scoreInput}
          keyboardType="number-pad"
          placeholder="Team 2"
          placeholderTextColor="#94A3B8"
          value={score2}
          onChangeText={setScore2}
        />
      </View>

      <Pressable style={styles.saveButton} onPress={submitMatch} disabled={saving}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving…' : 'Save Match'}</Text>
      </Pressable>

      <Text style={styles.subheader}>Recent matches</Text>
      <FlatList
        data={matches}
        keyExtractor={(m) => m.id}
        renderItem={({ item }) => (
          <View style={styles.matchRow}>
            <Text style={styles.matchText}>
              {item.match_players.filter((p) => p.team === 1).map((p) => nameFor(p.club_member_id)).join(' & ')}
              {'  '}{item.team1_score} – {item.team2_score}{'  '}
              {item.match_players.filter((p) => p.team === 2).map((p) => nameFor(p.club_member_id)).join(' & ')}
            </Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No matches logged yet.</Text>}
      />
    </View>
  );
}

function TeamPicker({ title, members, selected, onToggle }) {
  return (
    <View style={styles.teamPicker}>
      <Text style={styles.teamTitle}>{title}</Text>
      {members.map((m) => (
        <Pressable
          key={m.id}
          style={[styles.playerChip, selected.includes(m.id) && styles.playerChipSelected]}
          onPress={() => onToggle(m.id)}
        >
          <Text style={[styles.playerChipText, selected.includes(m.id) && styles.playerChipTextSelected]}>
            {m.display_name}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A', padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' },
  header: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 12 },
  subheader: { fontSize: 16, fontWeight: '600', color: '#fff', marginTop: 20, marginBottom: 8 },
  teamsRow: { flexDirection: 'row', gap: 12 },
  teamPicker: { flex: 1, backgroundColor: '#1E293B', borderRadius: 12, padding: 10 },
  teamTitle: { color: '#93C5FD', fontWeight: '700', marginBottom: 8 },
  playerChip: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, marginBottom: 6, backgroundColor: '#334155' },
  playerChipSelected: { backgroundColor: '#2563EB' },
  playerChipText: { color: '#CBD5E1' },
  playerChipTextSelected: { color: '#fff', fontWeight: '700' },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 12 },
  scoreInput: { backgroundColor: '#1E293B', color: '#fff', borderRadius: 8, padding: 12, width: 90, textAlign: 'center', fontSize: 18 },
  dash: { color: '#94A3B8', fontSize: 20 },
  saveButton: { backgroundColor: '#2563EB', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  matchRow: { backgroundColor: '#1E293B', borderRadius: 10, padding: 12, marginBottom: 8 },
  matchText: { color: '#E2E8F0' },
  empty: { color: '#64748B', textAlign: 'center', marginTop: 20 },
});
