-- ============================================================
-- MY LIFE — Supabase Database Setup
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ── 1. PROFILES TABLE ───────────────────────────────────────
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null default 'Adventurer',
  gender        text not null default 'neutral' check (gender in ('neutral', 'male', 'female')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ── 2. STAT VALUES TABLE ────────────────────────────────────
create table if not exists public.stat_values (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  stat_key     text not null check (stat_key in ('mind','fitness','nature','hygiene','nutrition','social','sleep')),
  value        integer not null default 50 check (value between 0 and 100),
  last_logged  date,
  streak       integer not null default 0,
  updated_at   timestamptz not null default now(),
  unique (user_id, stat_key)
);

-- ── 3. ENTRIES TABLE ────────────────────────────────────────
create table if not exists public.entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  date        date not null,
  content     text not null,
  stat_key    text not null check (stat_key in ('mind','fitness','nature','hygiene','nutrition','social','sleep')),
  boost       integer not null default 18,
  stats       jsonb,  -- [{stat_key, boost}] for multi-stat entries; stat_key holds the primary
  created_at  timestamptz not null default now()
);

-- Index for fast date queries
create index if not exists entries_user_date on public.entries(user_id, date);
create index if not exists stat_values_user on public.stat_values(user_id);

-- ── 4. ENABLE ROW LEVEL SECURITY ────────────────────────────
alter table public.profiles   enable row level security;
alter table public.stat_values enable row level security;
alter table public.entries    enable row level security;

-- ── 5. RLS POLICIES — PROFILES ──────────────────────────────
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ── 6. RLS POLICIES — STAT_VALUES ───────────────────────────
create policy "Users can view own stats"
  on public.stat_values for select
  using (auth.uid() = user_id);

create policy "Users can insert own stats"
  on public.stat_values for insert
  with check (auth.uid() = user_id);

create policy "Users can update own stats"
  on public.stat_values for update
  using (auth.uid() = user_id);

-- ── 7. RLS POLICIES — ENTRIES ───────────────────────────────
create policy "Users can view own entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Users can insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users can update own entries"
  on public.entries for update
  using (auth.uid() = user_id);

create policy "Users can delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

-- ── 8. AUTO-UPDATE updated_at TRIGGER ───────────────────────
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.handle_updated_at();

create trigger stat_values_updated_at
  before update on public.stat_values
  for each row execute procedure public.handle_updated_at();

-- ── 9. PUSH SUBSCRIPTIONS ───────────────────────────────────
create table if not exists public.push_subscriptions (
  endpoint      text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  subscription  jsonb not null,
  created_at    timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── MIGRATION (existing databases only) ─────────────────────
-- alter table public.entries add column if not exists stats jsonb;
-- alter table public.profiles drop constraint if exists profiles_gender_check;
-- alter table public.profiles add constraint profiles_gender_check check (gender in ('neutral', 'male', 'female'));
-- alter table public.profiles alter column gender set default 'neutral';
-- alter table public.profiles alter column display_name set default 'Adventurer';
-- (then run section 9 above)

-- Done! Your database is ready.
