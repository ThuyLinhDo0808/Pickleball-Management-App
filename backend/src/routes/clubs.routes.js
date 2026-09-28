const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { checkCapacity } = require('../middleware/checkCapacity');
const { dbError, notFound } = require('../utils/respond');

const router = express.Router();
router.use(requireAuth);

// Every query below is scoped by host_id = req.user.id — a host can only
// ever see or mutate their own clubs, regardless of what id is in the URL.

// ---- Clubs -----------------------------------------------------------

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('clubs')
    .select('*')
    .eq('host_id', req.user.id)
    .order('created_at', { ascending: false });
  if (error) return dbError(res, error);
  res.json({ clubs: data });
});

router.post('/', async (req, res) => {
  const { name, description, monthly_fee_default } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required.' });

  const { data, error } = await supabaseAdmin
    .from('clubs')
    .insert({ host_id: req.user.id, name, description, monthly_fee_default: monthly_fee_default || 0 })
    .select()
    .single();
  if (error) return dbError(res, error);
  res.status(201).json({ club: data });
});

router.get('/:clubId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('clubs')
    .select('*')
    .eq('id', req.params.clubId)
    .eq('host_id', req.user.id)
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Club');
  res.json({ club: data });
});

router.patch('/:clubId', async (req, res) => {
  const { name, description, monthly_fee_default, is_active } = req.body;
  const { data, error } = await supabaseAdmin
    .from('clubs')
    .update({ name, description, monthly_fee_default, is_active, updated_at: new Date().toISOString() })
    .eq('id', req.params.clubId)
    .eq('host_id', req.user.id)
    .select()
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Club');
  res.json({ club: data });
});

// ---- Club members ------------------------------------------------------

router.get('/:clubId/members', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('club_members')
    .select('*')
    .eq('club_id', req.params.clubId)
    .order('display_name', { ascending: true });
  if (error) return dbError(res, error);
  res.json({ members: data });
});

// checkCapacity runs AFTER we confirm the club belongs to this host, so a
// host can't be blocked/unblocked by someone else's usage, and can't probe
// other hosts' clubs.
router.post('/:clubId/members', async (req, res, next) => {
  const { data: club, error: clubErr } = await supabaseAdmin
    .from('clubs')
    .select('id')
    .eq('id', req.params.clubId)
    .eq('host_id', req.user.id)
    .maybeSingle();
  if (clubErr) return dbError(res, clubErr);
  if (!club) return notFound(res, 'Club');
  next();
}, checkCapacity, async (req, res) => {
  const { display_name, phone, dupr_level, member_type } = req.body;
  if (!display_name) return res.status(400).json({ error: 'display_name is required.' });

  const { data, error } = await supabaseAdmin
    .from('club_members')
    .insert({
      club_id: req.params.clubId,
      display_name,
      phone,
      dupr_level,
      member_type: member_type || 'fixed',
    })
    .select()
    .single();
  if (error) return dbError(res, error);
  res.status(201).json({ member: data, capacity: req.capacity });
});

router.patch('/:clubId/members/:memberId', async (req, res) => {
  const { display_name, phone, dupr_level, member_type, status } = req.body;
  const { data, error } = await supabaseAdmin
    .from('club_members')
    .update({
      display_name, phone, dupr_level, member_type, status,
      removed_at: status === 'removed' ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.memberId)
    .eq('club_id', req.params.clubId)
    .select()
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Member');
  res.json({ member: data });
});

// ---- Rankings ----------------------------------------------------------

router.get('/:clubId/rankings/all-time', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('v_club_rankings_all_time')
    .select('*')
    .eq('club_id', req.params.clubId)
    .order('win_rate_pct', { ascending: false });
  if (error) return dbError(res, error);
  res.json({ rankings: data });
});

router.get('/:clubId/rankings/monthly', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('v_club_rankings_monthly')
    .select('*')
    .eq('club_id', req.params.clubId)
    .order('month', { ascending: false })
    .order('win_rate_pct', { ascending: false });
  if (error) return dbError(res, error);
  res.json({ rankings: data });
});

// ---- Fund balance --------------------------------------------------------

router.get('/:clubId/fund-balance', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('v_club_fund_balance')
    .select('*')
    .eq('club_id', req.params.clubId)
    .maybeSingle();
  if (error) return dbError(res, error);
  res.json({ balance: data || { club_id: req.params.clubId, balance: 0, total_income: 0, total_expense: 0 } });
});

module.exports = router;
