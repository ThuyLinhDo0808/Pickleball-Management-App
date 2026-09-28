const { supabaseAdmin } = require('../config/supabase');

/**
 * Verifies the Supabase access token sent by the mobile app as:
 *   Authorization: Bearer <access_token>
 * and attaches the authenticated user to req.user (id, email, ...).
 *
 * This is the ONLY place trust is established — every route below reads
 * req.user.id as the host_id, never a value taken from the request body.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing bearer token.' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  req.user = data.user;
  next();
}

module.exports = { requireAuth };
