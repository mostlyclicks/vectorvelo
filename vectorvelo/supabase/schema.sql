-- ============================================================
-- VectorVelo database schema
-- Run this in Supabase → SQL Editor → New Query
-- ============================================================

-- Users table (mirrors Strava athlete data + app settings)
create table if not exists public.users (
  id                  uuid primary key default gen_random_uuid(),
  strava_athlete_id   bigint unique not null,
  strava_access_token text not null,
  strava_refresh_token text not null,
  strava_token_expiry  bigint not null,        -- unix timestamp
  display_name        text,
  avatar_url          text,
  -- HR zones (bpm ceilings per zone, zone 1 is < zone1_max)
  hr_zone1_max        int default 115,
  hr_zone2_max        int default 152,
  hr_zone3_max        int default 162,
  hr_zone4_max        int default 174,
  -- Power zones (watts, requires FTP)
  ftp                 int default 200,
  -- Preferences
  units               text default 'imperial' check (units in ('imperial','metric')),
  glow_level          numeric default 1.0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

-- Rides table
create table if not exists public.rides (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.users(id) on delete cascade,
  strava_activity_id  bigint,                  -- null until uploaded
  started_at          timestamptz not null,
  elapsed_seconds     int not null default 0,
  distance_meters     numeric not null default 0,
  avg_power_watts     numeric,
  max_power_watts     numeric,
  avg_hr_bpm          numeric,
  max_hr_bpm          numeric,
  avg_speed_kmh       numeric,
  max_speed_kmh       numeric,
  energy_kj           numeric,
  score               int,                     -- kJ rounded
  tcx_url             text,                    -- optional: Supabase Storage path
  strava_url          text,                    -- https://www.strava.com/activities/:id
  created_at          timestamptz default now()
);

-- Ride samples (1 Hz telemetry, kept for future charts/analysis)
create table if not exists public.ride_samples (
  id          bigserial primary key,
  ride_id     uuid not null references public.rides(id) on delete cascade,
  t           int not null,                    -- seconds since ride start
  power_w     smallint,
  cadence_rpm smallint,
  speed_kmh   numeric(5,2),
  hr_bpm      smallint
);
create index if not exists ride_samples_ride_id_idx on public.ride_samples(ride_id);

-- Row-level security: users can only see their own data
alter table public.users  enable row level security;
alter table public.rides  enable row level security;
alter table public.ride_samples enable row level security;

-- Service role bypasses RLS (used by our API routes with service key)
-- Anonymous / authenticated Supabase users are not used — auth is Strava-session-based

-- Allow service role full access (API routes use service key)
create policy "service_role_all" on public.users    for all using (true);
create policy "service_role_all" on public.rides    for all using (true);
create policy "service_role_all" on public.ride_samples for all using (true);

-- updated_at trigger
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

create trigger users_updated_at before update on public.users
  for each row execute function update_updated_at();
