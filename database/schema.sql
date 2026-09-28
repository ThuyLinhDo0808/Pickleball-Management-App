-- =====================================================================
-- PICKLEBALL ECOSYSTEM — SUPABASE / POSTGRESQL SCHEMA
-- Two workspaces (Club Manager / Xé Vé Manager) on one shared backend.
-- Run this whole file in the Supabase SQL Editor (Project > SQL Editor).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. EXTENSIONS
-- ---------------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. ENUM TYPES
-- ---------------------------------------------------------------------
do $$ begin
  create type subscription_tier as enum ('free', 'basic', 'standard', 'pro');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_type as enum ('fixed', 'guest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type member_status as enum ('active', 'inactive', 'removed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_status as enum ('draft', 'open', 'closed', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type participant_status as enum ('registered', 'waitlist', 'checked_in', 'no_show', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_type as enum ('singles', 'doubles', 'mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_type as enum ('income', 'expense');
exception when duplicate_object then null; end $$;

do $$ begin
  create type transaction_source as enum (
    'membership_fee', 'court_cost', 'ball_cost', 'event_fee',
    'event_expense', 'adjustment', 'other'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 2. USERS  (mirrors auth.users; every Host and every registered Player)
-- ---------------------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text unique,
  phone         text,
  full_name     text not null,
  avatar_url    text,
  dupr_rating   numeric(3,2),               -- global reference rating, optional
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. HOST SUBSCRIPTIONS  (tier -> capacity ceiling, shared across BOTH workspaces)
-- ---------------------------------------------------------------------
create table if not exists public.host_subscriptions (
  id                uuid primary key default uuid_generate_v4(),
  host_id           uuid not null references public.users(id) on delete cascade,
  tier              subscription_tier not null default 'free',
  max_capacity      integer not null default 30,
  current_period_start timestamptz not null default now(),
  current_period_end   timestamptz,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (host_id)
);

-- Keep max_capacity in lockstep with tier unless explicitly overridden.
create or replace function public.fn_set_default_capacity()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' or new.tier is distinct from old.tier then
    new.max_capacity := case new.tier
      when 'free'     then 30
      when 'basic'    then 100
      when 'standard' then 300
      when 'pro'      then 1000
    end;
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_host_subscriptions_capacity on public.host_subscriptions;
create trigger trg_host_subscriptions_capacity
  before insert or update on public.host_subscriptions
  for each row execute function public.fn_set_default_capacity();

-- ---------------------------------------------------------------------
-- 4. WORKSPACE 1 — CLUBS
-- ---------------------------------------------------------------------
create table if not exists public.clubs (
  id            uuid primary key default uuid_generate_v4(),
  host_id       uuid not null references public.users(id) on delete cascade,
  name          text not null,
  description   text,
  monthly_fee_default numeric(12,2) not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.club_members (
  id            uuid primary key default uuid_generate_v4(),
  club_id       uuid not null references public.clubs(id) on delete cascade,
  user_id       uuid references public.users(id) on delete set null, -- null = offline/manual entry
  display_name  text not null,       -- host-entered name, always present even without a user_id
  phone         text,
  dupr_level    numeric(3,2),
  member_type   member_type not null default 'fixed',
  status        member_status not null default 'active',
  joined_at     timestamptz not null default now(),
  removed_at    timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_club_members_club on public.club_members(club_id) where status = 'active';

-- ---------------------------------------------------------------------
-- 5. WORKSPACE 2 — EVENTS (Kèo)
-- ---------------------------------------------------------------------
create table if not exists public.events (
  id                uuid primary key default uuid_generate_v4(),
  host_id           uuid not null references public.users(id) on delete cascade,
  title             text not null,
  event_date        date not null,
  start_time        time not null,
  end_time          time,
  location          text,
  num_courts        integer not null default 1,
  max_slots         integer not null,
  required_level    numeric(3,2),          -- minimum DUPR/level to join, optional
  fee_amount        numeric(12,2) not null default 0,
  status            event_status not null default 'draft',
  court_cost        numeric(12,2) not null default 0,
  ball_cost         numeric(12,2) not null default 0,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.event_participants (
  id                uuid primary key default uuid_generate_v4(),
  event_id          uuid not null references public.events(id) on delete cascade,
  user_id           uuid references public.users(id) on delete set null,
  display_name      text not null,
  phone             text,
  status            participant_status not null default 'registered',
  fee_paid          boolean not null default false,
  fee_amount        numeric(12,2),         -- overrides events.fee_amount if set
  registered_at     timestamptz not null default now(),
  checked_in_at     timestamptz,
  waitlisted_at     timestamptz,
  no_show_at        timestamptz,
  cancelled_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_event_participants_event on public.event_participants(event_id);
create index if not exists idx_event_participants_active
  on public.event_participants(event_id)
  where status in ('registered', 'waitlist', 'checked_in');

-- Reliability score is derived, not stored redundantly: expose via a view (section 8).

-- ---------------------------------------------------------------------
-- 6. MATCHES  (belongs to EITHER a club OR an event, never both/neither)
-- ---------------------------------------------------------------------
create table if not exists public.matches (
  id              uuid primary key default uuid_generate_v4(),
  club_id         uuid references public.clubs(id) on delete cascade,
  event_id        uuid references public.events(id) on delete cascade,
  match_type      match_type not null default 'doubles',
  team1_score     integer not null default 0,
  team2_score     integer not null default 0,
  winner_team     smallint check (winner_team in (1, 2)),
  played_at       timestamptz not null default now(),
  recorded_by     uuid references public.users(id),
  created_at      timestamptz not null default now(),
  constraint chk_match_owner check (
    (club_id is not null and event_id is null) or
    (club_id is null and event_id is not null)
  )
);

create index if not exists idx_matches_club on public.matches(club_id);
create index if not exists idx_matches_event on public.matches(event_id);

-- Players within a match. A player row points to EITHER a club_member OR an
-- event_participant, matching whichever context the parent match belongs to.
create table if not exists public.match_players (
  id                  uuid primary key default uuid_generate_v4(),
  match_id            uuid not null references public.matches(id) on delete cascade,
  club_member_id      uuid references public.club_members(id) on delete cascade,
  event_participant_id uuid references public.event_participants(id) on delete cascade,
  team                smallint not null check (team in (1, 2)),
  constraint chk_match_player_ref check (
    (club_member_id is not null and event_participant_id is null) or
    (club_member_id is null and event_participant_id is not null)
  )
);

create index if not exists idx_match_players_match on public.match_players(match_id);
create index if not exists idx_match_players_club_member on public.match_players(club_member_id);
create index if not exists idx_match_players_event_participant on public.match_players(event_participant_id);

-- ---------------------------------------------------------------------
-- 7. TRANSACTIONS  (unified, append-only ledger for BOTH club funds and event P&L)
--    Corrections are made by voiding + inserting a new row, never by UPDATE
--    of amount/type — this preserves a full audit trail.
-- ---------------------------------------------------------------------
create table if not exists public.transactions (
  id              uuid primary key default uuid_generate_v4(),
  club_id         uuid references public.clubs(id) on delete cascade,
  event_id        uuid references public.events(id) on delete cascade,
  type            transaction_type not null,
  source          transaction_source not null default 'other',
  amount          numeric(12,2) not null check (amount >= 0),
  description     text,
  related_member_id      uuid references public.club_members(id) on delete set null,
  related_participant_id uuid references public.event_participants(id) on delete set null,
  created_by      uuid not null references public.users(id),
  is_voided       boolean not null default false,
  voided_at       timestamptz,
  void_reason     text,
  replaced_by     uuid references public.transactions(id),
  created_at      timestamptz not null default now(),
  constraint chk_txn_owner check (
    (club_id is not null and event_id is null) or
    (club_id is null and event_id is not null)
  )
);

create index if not exists idx_transactions_club on public.transactions(club_id) where is_voided = false;
create index if not exists idx_transactions_event on public.transactions(event_id) where is_voided = false;

-- Prevent hard deletes/edits of financial history at the DB level.
create or replace function public.fn_block_transaction_mutation()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Transactions are append-only; void the row instead of deleting it.';
  end if;
  if tg_op = 'UPDATE' then
    if old.amount is distinct from new.amount
       or old.type is distinct from new.type
       or old.club_id is distinct from new.club_id
       or old.event_id is distinct from new.event_id then
      raise exception 'Transactions are append-only; amount/type/owner cannot be edited. Void and insert a new row.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_transactions_no_delete on public.transactions;
create trigger trg_transactions_no_delete
  before delete on public.transactions
  for each row execute function public.fn_block_transaction_mutation();

drop trigger if exists trg_transactions_no_amend on public.transactions;
create trigger trg_transactions_no_amend
  before update on public.transactions
  for each row execute function public.fn_block_transaction_mutation();

-- =====================================================================
-- 8. VIEWS — capacity usage, rankings, reliability, event P&L
-- =====================================================================

-- 8.1 Current capacity usage per host (drives the tier limit check).
create or replace view public.v_host_capacity_usage as
select
  h.id as host_id,
  hs.tier,
  hs.max_capacity,
  coalesce(cm.member_count, 0) + coalesce(ep.participant_count, 0) as current_usage
from public.users h
join public.host_subscriptions hs on hs.host_id = h.id
left join (
  select c.host_id, count(*) as member_count
  from public.club_members cm
  join public.clubs c on c.id = cm.club_id
  where cm.status = 'active'
  group by c.host_id
) cm on cm.host_id = h.id
left join (
  select e.host_id, count(*) as participant_count
  from public.event_participants ep
  join public.events e on e.id = ep.event_id
  where ep.status in ('registered', 'waitlist', 'checked_in')
  group by e.host_id
) ep on ep.host_id = h.id;

-- 8.2 Club ranking (all-time): wins, losses, win rate per club member.
create or replace view public.v_club_rankings_all_time as
select
  mp.club_member_id,
  cm.club_id,
  cm.display_name,
  count(*) filter (where mp.team = m.winner_team) as wins,
  count(*) filter (where mp.team <> m.winner_team) as losses,
  count(*) as matches_played,
  round(
    100.0 * count(*) filter (where mp.team = m.winner_team) / nullif(count(*), 0), 1
  ) as win_rate_pct
from public.match_players mp
join public.matches m on m.id = mp.match_id
join public.club_members cm on cm.id = mp.club_member_id
where m.winner_team is not null
group by mp.club_member_id, cm.club_id, cm.display_name;

-- 8.3 Club ranking (monthly): same, scoped to current calendar month.
create or replace view public.v_club_rankings_monthly as
select
  mp.club_member_id,
  cm.club_id,
  cm.display_name,
  date_trunc('month', m.played_at) as month,
  count(*) filter (where mp.team = m.winner_team) as wins,
  count(*) filter (where mp.team <> m.winner_team) as losses,
  count(*) as matches_played,
  round(
    100.0 * count(*) filter (where mp.team = m.winner_team) / nullif(count(*), 0), 1
  ) as win_rate_pct
from public.match_players mp
join public.matches m on m.id = mp.match_id
join public.club_members cm on cm.id = mp.club_member_id
where m.winner_team is not null
group by mp.club_member_id, cm.club_id, cm.display_name, date_trunc('month', m.played_at);

-- 8.4 Club fund balance (income - expense, ignoring voided rows).
create or replace view public.v_club_fund_balance as
select
  club_id,
  sum(case when type = 'income' then amount else -amount end) as balance,
  sum(case when type = 'income' then amount else 0 end) as total_income,
  sum(case when type = 'expense' then amount else 0 end) as total_expense
from public.transactions
where club_id is not null and is_voided = false
group by club_id;

-- 8.5 Event profit/loss per event.
create or replace view public.v_event_finance as
select
  e.id as event_id,
  e.host_id,
  e.title,
  e.court_cost + e.ball_cost as fixed_costs,
  coalesce(t.total_income, 0) as fees_collected,
  coalesce(t.total_expense, 0) as other_expenses,
  coalesce(t.total_income, 0) - coalesce(t.total_expense, 0) - (e.court_cost + e.ball_cost) as profit_loss,
  (select count(*) from public.event_participants ep where ep.event_id = e.id and ep.status <> 'cancelled') as total_registered,
  (select count(*) from public.event_participants ep where ep.event_id = e.id and ep.fee_paid = true) as fees_paid_count,
  (select count(*) from public.event_participants ep where ep.event_id = e.id and ep.status in ('registered','checked_in') and ep.fee_paid = false) as fees_uncollected_count
from public.events e
left join (
  select event_id,
    sum(case when type = 'income' then amount else 0 end) as total_income,
    sum(case when type = 'expense' then amount else 0 end) as total_expense
  from public.transactions
  where event_id is not null and is_voided = false
  group by event_id
) t on t.event_id = e.id;

-- 8.6 Player reliability score across all past events (per host's player pool),
--     matched by phone number when no user_id is present (manual entries).
create or replace view public.v_player_reliability as
select
  e.host_id,
  coalesce(ep.user_id::text, ep.phone, lower(ep.display_name)) as player_key,
  max(ep.display_name) as display_name,
  count(*) as events_registered,
  count(*) filter (where ep.status = 'no_show') as no_shows,
  count(*) filter (where ep.status = 'checked_in') as check_ins,
  round(
    100.0 * count(*) filter (where ep.status = 'checked_in')
      / nullif(count(*) filter (where ep.status in ('checked_in', 'no_show')), 0), 1
  ) as reliability_pct
from public.event_participants ep
join public.events e on e.id = ep.event_id
group by e.host_id, coalesce(ep.user_id::text, ep.phone, lower(ep.display_name));

-- =====================================================================
-- 9. ROW LEVEL SECURITY — a Host only ever sees/writes their own data.
-- =====================================================================
alter table public.users enable row level security;
alter table public.host_subscriptions enable row level security;
alter table public.clubs enable row level security;
alter table public.club_members enable row level security;
alter table public.events enable row level security;
alter table public.event_participants enable row level security;
alter table public.matches enable row level security;
alter table public.match_players enable row level security;
alter table public.transactions enable row level security;

create policy "users_self" on public.users
  for select using (auth.uid() = id);
create policy "users_self_update" on public.users
  for update using (auth.uid() = id);

create policy "host_subscriptions_own" on public.host_subscriptions
  for all using (auth.uid() = host_id);

create policy "clubs_own" on public.clubs
  for all using (auth.uid() = host_id);

create policy "club_members_via_club" on public.club_members
  for all using (
    exists (select 1 from public.clubs c where c.id = club_members.club_id and c.host_id = auth.uid())
  );

create policy "events_own" on public.events
  for all using (auth.uid() = host_id);

create policy "event_participants_via_event" on public.event_participants
  for all using (
    exists (select 1 from public.events e where e.id = event_participants.event_id and e.host_id = auth.uid())
  );

create policy "matches_via_owner" on public.matches
  for all using (
    (club_id is not null and exists (select 1 from public.clubs c where c.id = matches.club_id and c.host_id = auth.uid()))
    or
    (event_id is not null and exists (select 1 from public.events e where e.id = matches.event_id and e.host_id = auth.uid()))
  );

create policy "match_players_via_match" on public.match_players
  for all using (
    exists (
      select 1 from public.matches m
      where m.id = match_players.match_id
      and (
        (m.club_id is not null and exists (select 1 from public.clubs c where c.id = m.club_id and c.host_id = auth.uid()))
        or
        (m.event_id is not null and exists (select 1 from public.events e where e.id = m.event_id and e.host_id = auth.uid()))
      )
    )
  );

create policy "transactions_via_owner" on public.transactions
  for all using (
    (club_id is not null and exists (select 1 from public.clubs c where c.id = transactions.club_id and c.host_id = auth.uid()))
    or
    (event_id is not null and exists (select 1 from public.events e where e.id = transactions.event_id and e.host_id = auth.uid()))
  );

-- =====================================================================
-- 10. NEW-USER BOOTSTRAP — auto-create a users row + Free subscription
--     the moment someone signs up via Supabase Auth.
-- =====================================================================
create or replace function public.fn_handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));

  insert into public.host_subscriptions (host_id, tier)
  values (new.id, 'free');

  return new;
end $$;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_auth_user();

-- =====================================================================
-- END OF SCHEMA
-- =====================================================================
