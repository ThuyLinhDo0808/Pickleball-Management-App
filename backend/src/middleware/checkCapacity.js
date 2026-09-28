const { supabaseAdmin } = require('../config/supabase');

/**
 * Enforces the Freemium capacity ceiling shared across BOTH workspaces.
 *
 * Capacity usage = (active club_members across all of the host's clubs)
 *                + (registered/waitlisted/checked-in event_participants
 *                   across all of the host's events)
 *
 * This reads from the v_host_capacity_usage view defined in schema.sql,
 * so the counting logic lives in exactly one place (the DB), not
 * duplicated in application code.
 *
 * Usage: attach as middleware on any route that ADDS a club member or
 * event participant, AFTER requireAuth has set req.user.
 *
 *   router.post('/clubs/:clubId/members', requireAuth, checkCapacity, handler)
 *
 * On success it also attaches req.capacity = { tier, max_capacity, current_usage }
 * so handlers can surface "X of Y used" in responses if useful.
 */
async function checkCapacity(req, res, next) {
  const hostId = req.user.id;

  const { data, error } = await supabaseAdmin
    .from('v_host_capacity_usage')
    .select('tier, max_capacity, current_usage')
    .eq('host_id', hostId)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'Failed to verify plan capacity.', details: error.message });
  }

  // No subscription row should never happen (bootstrap trigger creates one
  // on signup), but fail safe with Free-tier defaults rather than crashing.
  const usage = data || { tier: 'free', max_capacity: 30, current_usage: 0 };

  if (usage.current_usage >= usage.max_capacity) {
    return res.status(403).json({
      error: 'CAPACITY_LIMIT_REACHED',
      message: `Your ${usage.tier} plan allows up to ${usage.max_capacity} total members/participants. You're currently at ${usage.current_usage}. Upgrade your plan to add more.`,
      tier: usage.tier,
      max_capacity: usage.max_capacity,
      current_usage: usage.current_usage,
    });
  }

  req.capacity = usage;
  next();
}

module.exports = { checkCapacity };
