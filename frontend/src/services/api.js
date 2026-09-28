import { supabase } from './supabase';

// Set EXPO_PUBLIC_API_URL in frontend/.env (see .env.example).
//  - Physical phone on Wi-Fi: your computer's LAN IP, e.g. http://192.168.1.20:4000
//  - Deployed: your Render URL, e.g. https://pickleball-backend.onrender.com
// 'localhost' only works in a simulator on the same machine, never on a real phone.
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.96.239:4000';

// Render's free tier sleeps when idle; the first request can take ~30-60s.
const TIMEOUT_MS = 60000;

async function authHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json', ...(await authHeader()) };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (e) {
    const err = new Error(
      e?.name === 'AbortError'
        ? 'The server took too long to respond. It may be waking up - please try again in a moment.'
        : 'Cannot reach the server. Check your internet connection and the API URL.'
    );
    err.code = 'NETWORK';
    throw err;
  } finally {
    clearTimeout(timer);
  }

  let payload = null;
  try {
    payload = await res.json();
  } catch {
    // 204 No Content etc.
  }

  if (!res.ok) {
    // Keep the backend's machine-readable code (e.g. CAPACITY_LIMIT_REACHED)
    // so screens can react to it, and its human message for display.
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
