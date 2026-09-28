const express = require('express');
const { supabaseAdmin } = require('../config/supabase');
const { requireAuth } = require('../middleware/auth');
const { checkCapacity } = require('../middleware/checkCapacity');
const { dbError, notFound } = require('../utils/respond');

const router = express.Router();
router.use(requireAuth);

// ---- Events --------------------------------------------------------------

router.get('/', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('host_id', req.user.id)
    .order('event_date', { ascending: false });
  if (error) return dbError(res, error);
  res.json({ events: data });
});

router.post('/', async (req, res) => {
  const { title, event_date, start_time, end_time, location, num_courts, max_slots, required_level, fee_amount, court_cost, ball_cost, notes } = req.body;
  if (!title || !event_date || !start_time || !max_slots) {
    return res.status(400).json({ error: 'title, event_date, start_time and max_slots are required.' });
  }
  const { data, error } = await supabaseAdmin
    .from('events')
    .insert({
      host_id: req.user.id, title, event_date, start_time, end_time, location,
      num_courts: num_courts || 1, max_slots, required_level, fee_amount: fee_amount || 0,
      court_cost: court_cost || 0, ball_cost: ball_cost || 0, notes, status: 'open',
    })
    .select()
    .single();
  if (error) return dbError(res, error);
  res.status(201).json({ event: data });
});

router.get('/:eventId', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('*')
    .eq('id', req.params.eventId)
    .eq('host_id', req.user.id)
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Event');
  res.json({ event: data });
});

router.patch('/:eventId', async (req, res) => {
  const fields = (({ title, event_date, start_time, end_time, location, num_courts, max_slots, required_level, fee_amount, court_cost, ball_cost, status, notes }) =>
    ({ title, event_date, start_time, end_time, location, num_courts, max_slots, required_level, fee_amount, court_cost, ball_cost, status, notes }))(req.body);
  const { data, error } = await supabaseAdmin
    .from('events')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', req.params.eventId)
    .eq('host_id', req.user.id)
    .select()
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Event');
  res.json({ event: data });
});

// ---- Registration flow: main list vs waitlist happens automatically ------
// once max_slots is reached (checked here, independent of the plan-wide
// capacity ceiling enforced by checkCapacity).

async function loadOwnedEvent(req, res, next) {
  const { data, error } = await supabaseAdmin
    .from('events')
    .select('id, max_slots')
    .eq('id', req.params.eventId)
    .eq('host_id', req.user.id)
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Event');
  req.event = data;
  next();
}

router.get('/:eventId/participants', loadOwnedEvent, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('event_participants')
    .select('*')
    .eq('event_id', req.params.eventId)
    .order('registered_at', { ascending: true });
  if (error) return dbError(res, error);
  res.json({ participants: data });
});

router.post('/:eventId/participants', loadOwnedEvent, checkCapacity, async (req, res) => {
  const { display_name, phone, user_id, fee_amount } = req.body;
  if (!display_name) return res.status(400).json({ error: 'display_name is required.' });

  const { count, error: countErr } = await supabaseAdmin
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', req.params.eventId)
    .in('status', ['registered', 'checked_in']);
  if (countErr) return dbError(res, countErr);

  const goesToMainList = (count || 0) < req.event.max_slots;

  const { data, error } = await supabaseAdmin
    .from('event_participants')
    .insert({
      event_id: req.params.eventId,
      user_id: user_id || null,
      display_name,
      phone,
      fee_amount,
      status: goesToMainList ? 'registered' : 'waitlist',
      waitlisted_at: goesToMainList ? null : new Date().toISOString(),
    })
    .select()
    .single();
  if (error) return dbError(res, error);
  res.status(201).json({ participant: data, waitlisted: !goesToMainList, capacity: req.capacity });
});

router.post('/:eventId/participants/:participantId/check-in', loadOwnedEvent, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('event_participants')
    .update({ status: 'checked_in', checked_in_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', req.params.participantId)
    .eq('event_id', req.params.eventId)
    .select()
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Participant');
  res.json({ participant: data });
});

router.post('/:eventId/participants/:participantId/no-show', loadOwnedEvent, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('event_participants')
    .update({ status: 'no_show', no_show_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', req.params.participantId)
    .eq('event_id', req.params.eventId)
    .select()
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Participant');
  res.json({ participant: data });
});

// Cancelling/removing a registered participant promotes the longest-waiting
// waitlisted participant into 'registered', keeping the main list full.
router.post('/:eventId/participants/:participantId/cancel', loadOwnedEvent, async (req, res) => {
  const { data: cancelled, error: cancelErr } = await supabaseAdmin
    .from('event_participants')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', req.params.participantId)
    .eq('event_id', req.params.eventId)
    .select()
    .maybeSingle();
  if (cancelErr) return dbError(res, cancelErr);
  if (!cancelled) return notFound(res, 'Participant');

  let promoted = null;
  if (cancelled.status !== 'waitlist') {
    const { data: next } = await supabaseAdmin
      .from('event_participants')
      .select('*')
      .eq('event_id', req.params.eventId)
      .eq('status', 'waitlist')
      .order('waitlisted_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (next) {
      const { data: updatedNext } = await supabaseAdmin
        .from('event_participants')
        .update({ status: 'registered', waitlisted_at: null, updated_at: new Date().toISOString() })
        .eq('id', next.id)
        .select()
        .single();
      promoted = updatedNext;
    }
  }

  res.json({ cancelled, promoted });
});

router.patch('/:eventId/participants/:participantId/fee', loadOwnedEvent, async (req, res) => {
  const { fee_paid, fee_amount } = req.body;
  const { data, error } = await supabaseAdmin
    .from('event_participants')
    .update({ fee_paid, fee_amount, updated_at: new Date().toISOString() })
    .eq('id', req.params.participantId)
    .eq('event_id', req.params.eventId)
    .select()
    .maybeSingle();
  if (error) return dbError(res, error);
  if (!data) return notFound(res, 'Participant');
  res.json({ participant: data });
});

// ---- Event finance (Lai/Lo) ------------------------------------------

router.get('/:eventId/finance', loadOwnedEvent, async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('v_event_finance')
    .select('*')
    .eq('event_id', req.params.eventId)
    .maybeSingle();
  if (error) return dbError(res, error);
  res.json({ finance: data });
});

// ---- Player reliability (across this host's past events) --------------

router.get('/players/reliability', async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('v_player_reliability')
    .select('*')
    .eq('host_id', req.user.id)
    .order('reliability_pct', { ascending: true });
  if (error) return dbError(res, error);
  res.json({ players: data });
});

module.exports = router;
