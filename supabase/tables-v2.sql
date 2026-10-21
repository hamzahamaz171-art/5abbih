-- ============================================================
-- Live Sport Tracker — TABLES V2 (ajouts manquants)
-- Exécute APRÈS tables-only.sql dans Supabase → SQL Editor
-- RLS désactivé pour le développement
-- ============================================================

-- =============================================
-- 1. GATEWAYS LoRa (sidebar "Gateways")
-- =============================================
CREATE TABLE IF NOT EXISTS public.gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gateway_id TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'online',
  signal_strength INTEGER,
  last_seen_at TIMESTAMPTZ,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT gateways_status_check CHECK (status IN ('online', 'offline', 'warning'))
);

-- =============================================
-- 2. COLONNES CAPTEURS — live_tracking
-- =============================================
ALTER TABLE public.live_tracking
  ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS heading DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS altitude DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gyro_x DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gyro_y DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS gyro_z DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS accel_x DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS accel_y DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS accel_z DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS speed_zone INTEGER;

-- speed_zone : 1=idle, 2=walk, 3=jog, 4=run, 5=sprint

-- =============================================
-- 3. COLONNES — sensor_metadata
-- =============================================
ALTER TABLE public.sensor_metadata
  ADD COLUMN IF NOT EXISTS temperature DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signal_strength INTEGER,
  ADD COLUMN IF NOT EXISTS lora_rssi INTEGER;

-- =============================================
-- 4. LIEN UTILISATEUR <-> JOUEUR
-- =============================================
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS user_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_user_id_fkey'
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'players_user_id_key'
  ) THEN
    ALTER TABLE public.players
      ADD CONSTRAINT players_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_players_user_id ON public.players(user_id);

-- =============================================
-- 5. ZONES DE VITESSE (Performance Zones donut)
-- =============================================
CREATE TABLE IF NOT EXISTS public.speed_zone_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  zone INTEGER NOT NULL,
  duration_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  distance_meters DOUBLE PRECISION NOT NULL DEFAULT 0,
  percentage DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT speed_zone_stats_zone_check CHECK (zone BETWEEN 1 AND 5),
  UNIQUE (player_id, session_id, zone)
);

-- =============================================
-- 6. SAUTS (IMU — doc)
-- =============================================
CREATE TABLE IF NOT EXISTS public.jumps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  height_meters DOUBLE PRECISION,
  duration_seconds DOUBLE PRECISION,
  landing_impact DOUBLE PRECISION
);

-- =============================================
-- 7. HEATMAP (cellules pré-calculées)
-- =============================================
CREATE TABLE IF NOT EXISTS public.heatmap_cells (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  grid_x INTEGER NOT NULL,
  grid_y INTEGER NOT NULL,
  intensity DOUBLE PRECISION NOT NULL DEFAULT 0,
  dwell_seconds DOUBLE PRECISION NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (player_id, session_id, grid_x, grid_y)
);

-- =============================================
-- 8. BIOMÉCANIQUE / SYMÉTRIE (doc IMU)
-- =============================================
CREATE TABLE IF NOT EXISTS public.biomechanics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  left_impact DOUBLE PRECISION,
  right_impact DOUBLE PRECISION,
  symmetry_index DOUBLE PRECISION,
  notes TEXT
);

-- =============================================
-- 9. IMPORT CSV MicroSD (post-match)
-- =============================================
CREATE TABLE IF NOT EXISTS public.imported_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.players(id) ON DELETE CASCADE,
  session_id UUID REFERENCES public.training_sessions(id) ON DELETE SET NULL,
  file_name TEXT NOT NULL,
  file_path TEXT,
  rows_imported INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  imported_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT imported_files_status_check CHECK (
    status IN ('pending', 'processing', 'done', 'error')
  )
);

-- =============================================
-- 10. ÉLARGIR LES TYPES D'ALERTES
-- =============================================
ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE public.alerts ADD CONSTRAINT alerts_type_check
  CHECK (type IN (
    'speed', 'battery', 'acceleration', 'deceleration',
    'distance', 'jump', 'symmetry', 'temperature', 'other'
  ));

-- =============================================
-- 11. INDEX
-- =============================================
CREATE INDEX IF NOT EXISTS idx_gateways_team_id ON public.gateways(team_id);
CREATE INDEX IF NOT EXISTS idx_speed_zone_stats_session ON public.speed_zone_stats(session_id);
CREATE INDEX IF NOT EXISTS idx_jumps_session ON public.jumps(session_id);
CREATE INDEX IF NOT EXISTS idx_heatmap_cells_session ON public.heatmap_cells(session_id);
CREATE INDEX IF NOT EXISTS idx_biomechanics_session ON public.biomechanics(session_id);
CREATE INDEX IF NOT EXISTS idx_imported_files_player ON public.imported_files(player_id);

-- =============================================
-- 12. RLS DÉSACTIVÉ
-- =============================================
ALTER TABLE public.gateways DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.speed_zone_stats DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.jumps DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.heatmap_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.biomechanics DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_files DISABLE ROW LEVEL SECURITY;
