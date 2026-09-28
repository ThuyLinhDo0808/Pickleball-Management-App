// Vietnamese dong: no decimals, dot as thousands separator. Written by hand
// (no Intl) so it behaves identically on every device.
export function formatMoney(value) {
  const n = Math.round(Number(value) || 0);
  const sign = n < 0 ? '-' : '';
  return `${sign}${String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} ₫`;
}

// "1.500.000" / "1500000" / "1,5tr" -> digits only.
export function parseMoney(text) {
  const digits = String(text ?? '').replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
}

const pad = (n) => String(n).padStart(2, '0');
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isValidDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTime(s) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

// '2026-10-03' -> 'Sat, 3 Oct 2026'
export function formatDate(iso) {
  if (!iso || !isValidDate(String(iso).slice(0, 10))) return iso || '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DAYS[dow]}, ${d} ${MONTHS[m - 1]} ${y}`;
}

// '19:00:00' -> '19:00'
export const formatTime = (t) => (t ? String(t).slice(0, 5) : '');

// ISO timestamp -> '28 Sep, 19:05' in the phone's local time
export function formatDateTime(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// 'YYYY-MM' of an ISO timestamp in the phone's local time
export function localMonthKey(iso) {
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}
