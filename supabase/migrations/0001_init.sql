-- ShotIQ initial schema
-- Run in the Supabase SQL editor, or via `supabase db push` with the CLI.

-- ---------------------------------------------------------------- profiles
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  handicap     numeric,          -- null => estimated from ball data
  created_at   timestamptz not null default now()
);

-- Create a profile row whenever a user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------- sessions
create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  session_date date not null,
  name         text not null,
  file_name    text,
  source       text not null default 'garmin_r10',
  shot_count   int  not null default 0,
  -- Cached, fully computed analysis payload. Always recomputable from shots.
  analysis     jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists sessions_user_date_idx
  on public.sessions (user_id, session_date desc, created_at desc);

-- ---------------------------------------------------------------- shots
create table if not exists public.shots (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  shot_index    int  not null,
  hit_at        timestamptz,

  club_name     text not null,          -- raw, e.g. "7 Iron"
  club_type_raw text,                   -- raw R10 "Club Type" value
  club_category text not null,          -- derived: driver|wood|hybrid|iron|wedge|putter|other

  club_speed    numeric,
  attack_angle  numeric,
  club_path     numeric,
  club_face     numeric,
  face_to_path  numeric,
  ball_speed    numeric,
  smash_factor  numeric,
  launch_angle  numeric,
  launch_direction numeric,
  backspin      numeric,
  sidespin      numeric,
  spin_rate     numeric,
  spin_axis     numeric,
  apex_height   numeric,

  carry_distance            numeric,
  carry_deviation_angle     numeric,
  carry_deviation_distance  numeric,
  total_distance            numeric,
  total_deviation_angle     numeric,
  total_deviation_distance  numeric,

  quality        text not null default 'ok' check (quality in ('good','ok','bad')),
  quality_source text not null default 'auto' check (quality_source in ('auto','manual')),
  is_short_game  boolean not null default false
);
create index if not exists shots_session_idx on public.shots (session_id);
create index if not exists shots_user_club_idx on public.shots (user_id, club_name);

-- -------------------------------------------------- session_club_stats
-- One row per club per session. This is the durable trend store: every
-- cross-session chart and session-vs-session delta reads from here, so
-- trends never re-scan raw shots.
create table if not exists public.session_club_stats (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  session_date  date not null,
  club_name     text not null,
  club_category text not null,
  is_short_game boolean not null default false,

  n                int     not null,
  avg_carry        numeric,
  avg_total        numeric,
  avg_club_speed   numeric,
  avg_ball_speed   numeric,
  avg_smash        numeric,
  avg_path         numeric,
  avg_face         numeric,
  avg_face_to_path numeric,
  avg_attack_angle numeric,
  avg_deviation    numeric,   -- signed mean
  avg_abs_deviation numeric,  -- mean of |deviation|
  carry_stdev      numeric,
  carry_min        numeric,
  carry_max        numeric,

  good_n              int not null default 0,
  bad_n               int not null default 0,
  good_bad_carry_gap  numeric,

  dominant_metric     text,
  dominant_good_mean  numeric,
  dominant_bad_mean   numeric,
  dominant_effect     numeric,   -- Cohen's d

  unique (session_id, club_name)
);
create index if not exists scs_user_club_date_idx
  on public.session_club_stats (user_id, club_name, session_date);

-- ---------------------------------------------------------------- benchmarks
-- Reference table, not user data. Seeded with published/derived reference
-- ranges; intended to be replaced by real aggregated user data later.
create table if not exists public.benchmarks (
  club_category  text not null,
  handicap_band  text not null,   -- scratch | hcp10 | hcp20plus
  metric         text not null,   -- smash_factor | club_path_abs | club_face_abs | deviation_abs
  min_value      numeric,
  max_value      numeric,
  label          text not null,   -- pill text, e.g. "Scratch: 1.48+"
  sort_order     int  not null default 0,
  primary key (club_category, handicap_band, metric)
);

-- ---------------------------------------------------------------- waitlist
create table if not exists public.waitlist (
  id         uuid primary key default gen_random_uuid(),
  email      text not null unique,
  created_at timestamptz not null default now()
);

-- ================================================================ RLS
alter table public.profiles           enable row level security;
alter table public.sessions           enable row level security;
alter table public.shots              enable row level security;
alter table public.session_club_stats enable row level security;
alter table public.benchmarks         enable row level security;
alter table public.waitlist           enable row level security;

-- profiles key on id rather than user_id
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "own sessions" on public.sessions;
create policy "own sessions" on public.sessions
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own shots" on public.shots;
create policy "own shots" on public.shots
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own club stats" on public.session_club_stats;
create policy "own club stats" on public.session_club_stats
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Benchmarks are readable by any signed-in user, writable by nobody.
drop policy if exists "read benchmarks" on public.benchmarks;
create policy "read benchmarks" on public.benchmarks
  for select to authenticated using (true);

-- Waitlist: anyone may join, nobody may read it back.
drop policy if exists "join waitlist" on public.waitlist;
create policy "join waitlist" on public.waitlist
  for insert to anon, authenticated with check (true);
