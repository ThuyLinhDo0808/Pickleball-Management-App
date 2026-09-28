import { supabase } from './supabase';

// Point this at your Render deployment once live, e.g.
// 'https://pickleball-backend.onrender.com'
const API_BASE_URL = 'http://192.168.96.100:4000';

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // no JSON body (e.g. 204 No Content) — that's fine
  }

  if (!res.ok) {
    // Surface the backend's structured error (e.g. CAPACITY_LIMIT_REACHED)
    // so screens can show a specific, actionable message.
    const err = new Error(payload?.message || payload?.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = payload?.error;
    err.payload = payload;
    throw err;
  }
  return payload;
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};
