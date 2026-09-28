const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { dbError, notFound } = require('../utils/respond');

const router = express.Router();
router.use(requireAuth);

// A match belongs to EITHER a club OR an event. Ownership is verified
// against whichever parent is provided before any write happens.
async function assertOwnership(req, res, { club_id, event_id }) {
  if (club_id) {
    const { data } = await supabaseAdmin.from('clubs').select('id').eq('id', club_id).eq('host_id', req.user.id).maybeSingle();
    return !!data;
  }
  if (event_id) {
    const { data } = await supabaseAdmin.from('events').select('id').eq('id', event_id).eq('host_id', req.user.id).maybeSingle();
    return !!data;
  }
  return false;
}

// List matches for a club or an event: GET /api/matches?club_id=... or ?event_id=...
router.get('/', async (req, res) => {
  const { club_id, event_id } = req.query;
  if (!club_id && !event_id) return res.status(400).json({ error: 'club_id or event_id query param is required.' });

  const owned = await assertOwnership(req, res, { club_id, event_id });
  if (!owned) return notFound(res, club_id ? 'Club' : 'Event');

  let query = supabaseAdmin
    .from('matches')
    .select('*, match_players(*)')
    .order('played_at', { ascending: false });
  query = club_id ? query.eq('club_id', club_id) : query.eq('event_id', event_id);

  const { data, error } = await query;
  if (error) return dbError(res, error);
  res.json({ matches: data });
});

// Record a match + its players in one call.
// Body: {
//   club_id | event_id,
//   match_type: 'singles' | 'doubles' | 'mixed',
//   team1_score, team2_score,
//   team1_player_ids: [...], team2_player_ids: [...]   // club_member_id OR event_participant_id, matching the parent
// }
router.post('/', async (req, res) => {
  const { club_id, event_id, match_type, team1_score, team2_score, team1_player_ids, team2_player_ids } = req.body;

  if (!club_id && !event_id) return res.status(400).json({ error: 'club_id or event_id is required.' });
  if (club_id && event_id) return res.status(400).json({ error: 'Provide only one of club_id or event_id.' });
  if (!Array.isArray(team1_player_ids) || !Array.isArray(team2_player_ids) || !team1_player_ids.length || !team2_player_ids.length) {
    return res.status(400).json({ error: 'team1_player_ids and team2_player_ids are required arrays.' });
  }
  if (typeof team1_score !== 'number' || typeof team2_score !== 'number' || team1_score === team2_score) {
    return res.status(400).json({ error: 'team1_score and team2_score must be numbers and cannot tie.' });
  }

  const owned = await assertOwnership(req, res, { club_id, event_id });
  if (!owned) return notFound(res, club_id ? 'Club' : 'Event');

  const winner_team = team1_score > team2_score ? 1 : 2;

  const { data: match, error: matchErr } = await supabaseAdmin
    .from('matches')
    .insert({
      club_id: club_id || null,
      event_id: event_id || null,
      match_type: match_type || 'doubles',
      team1_score, team2_score, winner_team,
      recorded_by: req.user.id,
    })
    .select()
    .single();
  if (matchErr) return dbError(res, matchErr);

  const playerField = club_id ? 'club_member_id' : 'event_participant_id';
  const rows = [
    ...team1_player_ids.map((id) => ({ match_id: match.id, team: 1, [playerField]: id })),
    ...team2_player_ids.map((id) => ({ match_id: match.id, team: 2, [playerField]: id })),
  ];

  const { data: players, error: playersErr } = await supabaseAdmin
    .from('match_players')
    .insert(rows)
    .select();

  if (playersErr) {
    // Roll back the orphaned match so we never leave a scoreless/playerless record.
    await supabaseAdmin.from('matches').delete().eq('id', match.id);
    return dbError(res, playersErr);
  }

  res.status(201).json({ match: { ...match, match_players: players } });
});

router.delete('/:matchId', async (req, res) => {
  const { data: match } = await supabaseAdmin.from('matches').select('club_id, event_id').eq('id', req.params.matchId).maybeSingle();
  if (!match) return notFound(res, 'Match');

  const owned = await assertOwnership(req, res, match);
  if (!owned) return notFound(res, 'Match');

  const { error } = await supabaseAdmin.from('matches').delete().eq('id', req.params.matchId);
  if (error) return dbError(res, error);
  res.status(204).send();
});

module.exports = router;
