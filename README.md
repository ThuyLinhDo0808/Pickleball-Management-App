# Pickleball Host — full stack

One Expo app, two isolated workspaces (Club Manager / Xé Vé Manager), one Node/Express
API, one Supabase Postgres database.

## First-run checklist (do these in order)

1. **Database** — Supabase → SQL Editor → paste all of `database/schema.sql` → Run.
   Check the result panel for errors, then confirm the tables exist in Table Editor.
   Safe to re-run. It also backfills accounts created before the tables existed.
2. **Supabase Auth** — Authentication → Providers → Email → turn **Confirm email OFF**
   while testing (otherwise new accounts must click an emailed link first).
3. **Backend**
   ```
   cd backend
   cp .env.example .env      # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service_role, NOT anon)
   npm install
   npm run dev               # http://localhost:4000/health should answer {"status":"ok"}
   ```
4. **App**
   ```
   cd frontend
   npm install @react-navigation/bottom-tabs@^6 @expo/vector-icons expo-status-bar
   cp .env.example .env      # EXPO_PUBLIC_API_URL=http://<your-computer-LAN-ip>:4000
   # edit src/services/supabase.js -> your project URL + ANON key
   npx expo start -c
   ```
   Phone and computer must be on the same Wi-Fi (or point the URL at your Render deploy).

## What's in the app

**Club Manager** — club list + create → tabs:
Members (add/edit/remove, search, fixed vs guest, DUPR) · Matches (singles/doubles/mixed,
score entry, delete) · Rankings (this month / all-time, wins + win rate) · Fund (collect
monthly fees, log court/ball expenses, balance, append-only history with void).

**Xé Vé Manager** — event list + create → tabs:
Players (main list, automatic waitlist + promotion, check-in, no-show, cancel) ·
Finance (profit/loss per event, mark fees paid, court/ball costs, other expenses, status).
Plus a host-wide **Player reliability** board.

**Both** — plan banner (used / limit), Plans screen, sign-out. Hitting the limit shows a
clear message with a shortcut to the Plans screen.

## Rules worth knowing

- **Capacity** = active club members + players on *upcoming* events (draft/open/closed).
  Marking an event "Done" or "Cancelled" frees its seats.
- **Ledger is append-only.** Fee/expense mistakes are voided, never deleted. Unticking a
  fee voids its income entry automatically.
- **Reliability** = check-ins ÷ (check-ins + no-shows), matched by phone number.

## Before you launch

- Set `ALLOW_TIER_SELF_SERVE=false` on the server — otherwise any user can give
  themselves the Pro plan. Real plan changes should come from a payment webhook.
- Render's free tier sleeps when idle; the first request after a pause is slow.
- Not built yet: event-level match logging, editing a club's name/fee, push notifications,
  payments.
