-- ============================================================
-- Live Sport Tracker — Schéma SQL complet
-- Exécute dans : Supabase Dashboard → SQL Editor → Run
--
-- RLS désactivé volontairement pour le développement.
-- Réactive-le en production quand l'app sera stable.
-- ============================================================

-- =============================================
-- 0. NETTOYAGE DES ANCIENNES POLITIQUES RLS (si existantes)
-- =============================================
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_insert_own" on public.profiles;

-- =============================================
-- 1. AUTH & PROFILS (login / signup)
-- =============================================
-- Supabase gère auth.users automatiquement (email, mot de passe).
-- profiles stocke les infos affichées dans l'app (nom, rôle).

create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  name text not null,
  role text not null default 'Coach',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Création automatique du profil à l'inscription (Sign Up)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'Utilisateur'),
    coalesce(new.raw_user_meta_data->>'role', 'Coach')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Mise à jour automatique de updated_at
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated_at on public.profiles;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- =============================================
-- 2. TABLES DE BASE (équipes & joueurs)
-- =============================================

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  coach_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

drop trigger if exists teams_updated_at on public.teams;

create trigger teams_updated_at
  before update on public.teams
  for each row execute function public.handle_updated_at();

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles(id) on delete set null,
  team_id uuid references public.teams(id) on delete cascade,
  name text not null,
  number integer,
  position text,
  esp_id text unique,
  status text not null default 'active',
  photo_url text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint players_status_check check (status in ('active', 'injured', 'inactive'))
);

drop trigger if exists players_updated_at on public.players;

create trigger players_updated_at
  before update on public.players
  for each row execute function public.handle_updated_at();

create table if not exists public.sensor_metadata (
  esp_id text primary key,
  player_id uuid references public.players(id) on delete set null,
  firmware_version text,
  last_calibration_date date,
  battery_health_percentage integer,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint sensor_battery_check check (
    battery_health_percentage is null
    or (battery_health_percentage >= 0 and battery_health_percentage <= 100)
  )
);

drop trigger if exists sensor_metadata_updated_at on public.sensor_metadata;

create trigger sensor_metadata_updated_at
  before update on public.sensor_metadata
  for each row execute function public.handle_updated_at();

-- =============================================
-- 3. SESSIONS D'ENTRAÎNEMENT
-- =============================================

create table if not exists public.training_sessions (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  name text,
  date timestamptz default now() not null,
  status text not null default 'planned',
  location text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null,
  constraint training_sessions_status_check check (
    status in ('planned', 'active', 'finished')
  )
);

drop trigger if exists training_sessions_updated_at on public.training_sessions;

create trigger training_sessions_updated_at
  before update on public.training_sessions
  for each row execute function public.handle_updated_at();

-- Joueurs participants à une session
create table if not exists public.session_players (
  session_id uuid references public.training_sessions(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  joined_at timestamptz default now() not null,
  primary key (session_id, player_id)
);

-- =============================================
-- 4. DONNÉES TEMPORELLES (time-series)
-- =============================================

create table if not exists public.live_tracking (
  id bigserial primary key,
  player_id uuid references public.players(id) on delete cascade,
  session_id uuid references public.training_sessions(id) on delete cascade,
  esp_id text,
  timestamp timestamptz default now() not null,
  latitude double precision,
  longitude double precision,
  speed double precision,
  distance double precision,
  battery integer,
  acceleration double precision
);

create table if not exists public.alerts (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  session_id uuid references public.training_sessions(id) on delete set null,
  type text not null,
  message text,
  created_at timestamptz default now() not null,
  is_read boolean not null default false,
  constraint alerts_type_check check (
    type in ('speed', 'battery', 'acceleration', 'distance', 'other')
  )
);

create table if not exists public.sprints (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  session_id uuid references public.training_sessions(id) on delete cascade,
  timestamp timestamptz default now() not null,
  speed double precision,
  duration double precision,
  distance double precision
);

create table if not exists public.player_loads (
  id uuid primary key default gen_random_uuid(),
  player_id uuid references public.players(id) on delete cascade,
  session_id uuid references public.training_sessions(id) on delete cascade,
  timestamp timestamptz default now() not null,
  player_load double precision,
  intensity text
);

-- =============================================
-- 5. INDEX (performance Dashboard)
-- =============================================

create index if not exists idx_teams_coach_id on public.teams(coach_id);
create index if not exists idx_players_team_id on public.players(team_id);
create index if not exists idx_players_user_id on public.players(user_id);
create index if not exists idx_players_esp_id on public.players(esp_id);
create index if not exists idx_training_sessions_team_id on public.training_sessions(team_id);
create index if not exists idx_training_sessions_date on public.training_sessions(date desc);
create index if not exists idx_session_players_player_id on public.session_players(player_id);
create index if not exists idx_live_tracking_player_time on public.live_tracking(player_id, timestamp desc);
create index if not exists idx_live_tracking_session_time on public.live_tracking(session_id, timestamp desc);
create index if not exists idx_live_tracking_esp_id on public.live_tracking(esp_id);
create index if not exists idx_sprints_session on public.sprints(session_id);
create index if not exists idx_sprints_player_time on public.sprints(player_id, timestamp desc);
create index if not exists idx_player_loads_session on public.player_loads(session_id);
create index if not exists idx_alerts_player_id on public.alerts(player_id);
create index if not exists idx_alerts_is_read on public.alerts(is_read) where is_read = false;

-- =============================================
-- 6. RLS DÉSACTIVÉ (développement)
-- =============================================

alter table public.profiles disable row level security;
alter table public.teams disable row level security;
alter table public.players disable row level security;
alter table public.sensor_metadata disable row level security;
alter table public.training_sessions disable row level security;
alter table public.session_players disable row level security;
alter table public.live_tracking disable row level security;
alter table public.alerts disable row level security;
alter table public.sprints disable row level security;
alter table public.player_loads disable row level security;

-- =============================================
-- 7. DONNÉES DE DÉMO (optionnel — commente si non voulu)
-- =============================================

-- Décommente les lignes ci-dessous pour insérer une équipe de test
-- (remplace COACH_UUID par l'id d'un utilisateur existant dans profiles)

/*
insert into public.teams (name, coach_id)
values ('Équipe U19', 'COACH_UUID');

insert into public.players (team_id, name, number, position, esp_id, status)
select t.id, p.name, p.number, p.position, p.esp_id, 'active'
from public.teams t
cross join (
  values
    ('Ahmed Ben Ali', 10, 'Milieu', 'ESP-010'),
    ('Mohamed Khaled', 7, 'Attaquant', 'ESP-007'),
    ('Youssef Miled', 20, 'Défenseur', 'ESP-020'),
    ('Oussema Trabelsi', 8, 'Milieu', 'ESP-008'),
    ('Karim Jebali', 15, 'Gardien', 'ESP-015')
) as p(name, number, position, esp_id)
where t.name = 'Équipe U19'
limit 1;
*/
