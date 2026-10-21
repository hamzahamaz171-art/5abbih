-- ============================================================
-- Activer le temps réel Supabase pour le dashboard
-- Exécute dans Supabase → SQL Editor
-- ============================================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sprints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.player_loads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.players;
ALTER PUBLICATION supabase_realtime ADD TABLE public.speed_zone_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE public.heatmap_cells;
ALTER PUBLICATION supabase_realtime ADD TABLE public.gateways;

-- Si une table est déjà dans la publication, ignore l'erreur et continue.
