-- ============================================================
-- Migration : ajouter coach_id à teams (bases créées avant cette colonne)
-- Exécute dans Supabase → SQL Editor → Run
-- ============================================================

ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_teams_coach_id ON public.teams(coach_id);

-- Lie l'équipe existante au coach connecté (remplace l'UUID si besoin)
UPDATE public.teams
SET coach_id = '26b75e73-b83f-48ae-8a30-5187c61583ed'
WHERE id = '84a71a3b-87a9-430c-9282-7ae620db9200'
  AND coach_id IS NULL;
