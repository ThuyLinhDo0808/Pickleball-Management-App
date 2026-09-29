# Pickleball Host — full stack

One Expo app (Vietnamese-first, with English), two connected workspaces (Club Manager
and Xé Vé Manager), one Node/Express API, one Supabase Postgres database.

## First-run checklist

1. **Database** — Supabase → SQL Editor → paste all of `database/schema.sql` → Run.
   Safe to re-run on an existing project (it upgrades in place and backfills any
   accounts created before the tables existed).
2. **Supabase Auth** — Authentication → Providers → Email → turn Confirm email OFF
   while testing.
3. **Backend**
   ```
   cd backend
   cp .env.example .env      # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (service_role, not anon)
   npm install
   npm run dev                # http://localhost:4000/health -> {"status":"ok"}
   ```
4. **App**
   ```
   cd frontend
   npx expo install           # installs + auto-fixes versions for the SDK you have
   cp .env.example .env       # EXPO_PUBLIC_API_URL=http://<your-computer-LAN-ip>:4000
   # edit src/services/supabase.js -> your project URL + anon key
   npx expo start -c
   ```
   Phone and computer must be on the same Wi-Fi (or point the URL at your Render deploy).

## What's new in this update

- **Vietnamese-first, bilingual.** Every screen is translated (`src/i18n/vi.js`,
  `src/i18n/en.js`); Vietnamese is the default and the fallback if a key is ever
  missing from the active language. Switch language from the sign-in screen, the
  welcome screen, or Account → Language — it's remembered on the device.
- **Club ↔ Event data portability.** An event can optionally belong to a club
  (`events.club_id`). A club's **Events** tab lists that club's events and can create
  a new one preselected to that club. From an event's **Players** tab, **Import from
  club** lets the host tick existing club members and clone them straight into the
  event's roster (duplicates by phone/name are skipped automatically, and the plan
  limit is checked for the whole batch).
- **Schedule.** The event workspace's home screen is now a real schedule: a month
  calendar with day dots, a day agenda, and a searchable/filterable all-events list
  (upcoming/past, filter by club). Events can also be created as a weekly series
  (up to 12 occurrences) from one form.
- **Excel export.** Event Finance has an Export button that builds a `.xlsx` with
  three sheets (Summary, Players, Expenses) and opens the share sheet. Every total
  is a live Excel formula (not a static number), and Court/Ball cost cells are
  plain numbers the host can overtype to test different scenarios by hand.
- **More professional shell.** Native date/time pickers, a bottom-sheet Account
  screen (language, workspace switch, sign-out), a persistent plan/capacity banner,
  toasts instead of silent saves, avatars, empty/loading/error states throughout,
  and a workspace switcher that lives in the header instead of a "leave and choose
  again" flow. The chosen workspace is remembered between launches.

## Rules worth knowing

- **Capacity** = active club members + players on *upcoming* events (draft/open/closed).
  Marking an event "Done" or "Cancelled" frees its seats.
- **Ledger is append-only.** Mistakes are voided, never deleted. Unticking a fee
  automatically voids its income entry.
- **Reliability** = check-ins ÷ (check-ins + no-shows), matched by phone number.
- **Import from club** matches existing event participants by club-member id, then
  phone, then name, so re-importing the same club never creates duplicates.

## Before you launch

- Set `ALLOW_TIER_SELF_SERVE=false` on the server — otherwise any user can give
  themselves the Pro plan. Real plan changes should come from a payment webhook.
- Render's free tier sleeps when idle; the first request after a pause is slow
  (the app shows a friendly "waking up" message rather than a raw network error).
- Not built yet: logging matches inside an event, payments, push notifications.
