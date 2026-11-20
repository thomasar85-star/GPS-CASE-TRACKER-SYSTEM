-- ============================================================================
-- Ghana Police Service Case Tracker - Supabase PostgreSQL Schema & RLS Policies
-- Run this script in your Supabase Dashboard -> SQL Editor
-- ============================================================================

-- 1. Police Stations Reference Table
create table if not exists public.stations (
  id text primary key,
  name text not null,
  code text not null,
  region text not null,
  division text not null,
  phone text,
  commander text not null,
  created_at timestamptz not null default now()
);

alter table public.stations enable row level security;

create policy "Authenticated officers can read stations"
  on public.stations for select
  to authenticated
  using (true);

create policy "Authenticated officers can seed missing stations"
  on public.stations for insert
  to authenticated
  with check (true);

-- Seed default Ghana Police Service stations
insert into public.stations (id, name, code, region, division, phone, commander)
values
  ('stn_accra_central', 'Accra Central Divisional Police Headquarters', 'ACR', 'Greater Accra Region', 'Ministries / Central Business District', '+233 302 664 611', 'Chief Superintendent Nana Kwabena Osei'),
  ('stn_cantonments', 'Cantonments District Police Station', 'CNT', 'Greater Accra Region', 'Cantonments / Labone District', '+233 302 776 544', 'Superintendent Comfort Mensah'),
  ('stn_kaneshie', 'Kaneshie Divisional Police Command', 'KNS', 'Greater Accra Region', 'Kaneshie / Okaikwei South', '+233 302 223 881', 'Chief Superintendent Samuel Addo'),
  ('stn_kumasi_central', 'Kumasi Central Divisional Police Headquarters', 'KMS', 'Ashanti Region', 'Kumasi Metro / Adum Command', '+233 322 022 323', 'Assistant Commissioner of Police Kwadwo Antwi'),
  ('stn_takoradi_harbor', 'Takoradi Harbor Police Station', 'TKD', 'Western Region', 'Sekondi-Takoradi Metropolitan Division', '+233 312 023 112', 'Superintendent Francisca Quansah'),
  ('stn_tamale_metro', 'Tamale Metropolitan Police Headquarters', 'TML', 'Northern Region', 'Tamale Central Command', '+233 372 022 419', 'Chief Superintendent Yakubu Alhassan')
on conflict (id) do nothing;

-- 2. Officer Profiles Table (Linked 1:1 with Supabase auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  badge_id text not null,
  rank text not null default 'Inspector (CID)',
  station_id text not null references public.stations(id) default 'stn_accra_central',
  station_name text not null default 'Accra Central Divisional Police Headquarters',
  role text not null default 'investigator' check (role in ('counter_nco', 'station_officer', 'investigator', 'senior_officer')),
  email text not null,
  phone text default '+233 24 000 0000',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can insert their own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Trigger to auto-create officer profile on Supabase Auth sign up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_station_id text;
  v_station_name text;
begin
  v_station_id := coalesce(new.raw_user_meta_data->>'station_id', 'stn_accra_central');
  v_station_name := coalesce(new.raw_user_meta_data->>'station_name', 'Accra Central Divisional Police Headquarters');

  insert into public.profiles (id, name, badge_id, rank, station_id, station_name, role, email, phone, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'badge_id', 'GPS-' || upper(substr(new.id::text, 1, 6))),
    coalesce(new.raw_user_meta_data->>'rank', 'Inspector (CID)'),
    v_station_id,
    v_station_name,
    coalesce(new.raw_user_meta_data->>'role', 'investigator'),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'phone', '+233 24 000 0000'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Criminal & General Case Dockets Table
create table if not exists public.cases (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  docket_number text not null,
  offence_category text not null,
  offence_title text not null,
  act29_offence_code text,
  act29_section text,
  statute_citation text,
  incident_date_time text not null,
  lodged_date_time text not null,
  station_id text not null references public.stations(id),
  station_name text not null,
  location_description text not null,
  latitude double precision,
  longitude double precision,
  narrative text not null,
  complainant jsonb not null default '{}'::jsonb,
  suspects jsonb not null default '[]'::jsonb,
  evidence jsonb not null default '[]'::jsonb,
  witness_statements jsonb not null default '[]'::jsonb,
  submissions jsonb not null default '[]'::jsonb,
  officer_in_charge_id text,
  officer_in_charge_name text,
  officer_in_charge_badge text,
  status text not null default 'lodged',
  status_updated_at text not null,
  priority text not null default 'standard',
  court_record jsonb,
  disposition_notes text,
  disposition_date text,
  flagged_for_senior_review boolean not null default false,
  flag_reason text,
  crime_scene_photos jsonb,
  stolen_property_photos jsonb,
  is_synthetic boolean not null default false,
  is_offline_staged boolean not null default false,
  synced_at text,
  updated_timestamp bigint not null,
  server_timestamp bigint not null,
  sync_conflict_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, docket_number)
);

-- Ensure GPS coordinate columns exist if upgrading an existing cases table
alter table public.cases add column if not exists latitude double precision;
alter table public.cases add column if not exists longitude double precision;

alter table public.cases enable row level security;

create policy "Officers can view their own cases"
  on public.cases for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Officers can insert their own cases"
  on public.cases for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Officers can update their own cases"
  on public.cases for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Officers can delete their own cases"
  on public.cases for delete
  to authenticated
  using (auth.uid() = user_id);

-- Enable Supabase Realtime for live case docket updates
alter publication supabase_realtime add table public.cases;
