# Pickleball Ecosystem — Full Stack Setup

One React Native (Expo) app, two isolated workspaces (Club Manager / Xé Vé
Manager), one Node/Express backend, one Supabase Postgres database.

## 1. Database (Supabase)
1. Create a free project at supabase.com.
2. Open **SQL Editor** and run `database/schema.sql` in full.
3. This creates all tables/views/RLS policies, and a trigger that
   auto-provisions a `users` row + Free-tier `host_subscriptions` row for
   every new `auth.users` signup.
4. Grab your `Project URL`, `anon` key, and `service_role` key from
   **Project Settings → API**.

## 2. Backend (Render, free tier)
```
cd backend
cp .env.example .env   # fill in SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
npm install
npm run dev             # local dev on http://localhost:4000
```
Deploy: push to GitHub, create a new **Web Service** on Render pointing at
`backend/`, set the same env vars in the Render dashboard (or use the
included `render.yaml` as a Blueprint). Free tier spins down when idle —
first request after inactivity will be slow to respond.

Capacity enforcement: any route that adds a `club_member` or
`event_participant` runs `checkCapacity` first, which reads the
`v_host_capacity_usage` view and returns **403 CAPACITY_LIMIT_REACHED**
once the host's tier ceiling (30 / 100 / 300 / 1000) is hit — counting
both workspaces together, since it's one shared account limit.

## 3. Mobile app (Expo)
```
cd frontend
npm install
# edit src/services/supabase.js  -> SUPABASE_URL / anon key
# edit src/services/api.js       -> API_BASE_URL (your Render URL once deployed)
npx expo start
```
`App.js` is the mode fork: after sign-in, `ModeSwitcherScreen` sends the
user into either the Club Manager stack or the Xé Vé Manager stack — they
share auth and the backend, but render completely separate screens and
state. `MatchLoggerScreen` and `EventFinanceScreen` are the two example
screens requested; wire up a club/event picker before the hardcoded ids in
`App.js` in a real build.

## What to build next
- Club: Members list/edit screen, monthly fund ledger screen, rankings screen.
- Xé Vé: Create-event form, registration/waitlist list, check-in screen,
  player reliability leaderboard.
- A shared "Upgrade plan" screen driven by `GET /api/host/me` — wire
  `POST /api/host/subscription` to a real payment webhook before launch,
  it's client-callable here only as a placeholder.
