-- ============================================================
-- Données de démo pour tester le dashboard
-- REMPLACE 'TON_COACH_UUID' par ton id dans la table profiles
-- Exécute APRÈS tables-only.sql (+ tables-v2.sql optionnel)
-- ============================================================

-- 1. Équipe
INSERT INTO public.teams (id, name, coach_id)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Équipe U19',
  'TON_COACH_UUID'
)
ON CONFLICT (id) DO NOTHING;

-- 2. Joueurs
INSERT INTO public.players (id, team_id, name, number, position, esp_id, status) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ahmed Ben Ali', 10, 'Milieu', 'ESP-010', 'active'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Mohamed Khaled', 7, 'Attaquant', 'ESP-007', 'active'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'Youssef Miled', 20, 'Défenseur', 'ESP-020', 'active'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Oussema Trabelsi', 8, 'Milieu', 'ESP-008', 'active'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Karim Jebali', 15, 'Gardien', 'ESP-015', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. Session active
INSERT INTO public.training_sessions (id, team_id, name, status, location)
VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Entraînement du jour',
  'active',
  'Terrain principal'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Gateways LoRa — décommente si tables-v2.sql est exécuté
-- INSERT INTO public.gateways ...

-- 5. Live tracking
INSERT INTO public.live_tracking (player_id, session_id, esp_id, latitude, longitude, speed, distance, battery, acceleration, temperature) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'ESP-010', 36.8065, 10.1815, 18.6, 1420, 92, 2.1, 36.5),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'ESP-007', 36.8068, 10.1820, 22.4, 1230, 89, 3.2, 36.7),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'ESP-020', 36.8062, 10.1810, 15.2, 1120, 93, 1.8, 36.4),
  ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'ESP-008', 36.8070, 10.1825, 14.8, 980, 88, -3.1, 36.6),
  ('b0000000-0000-0000-0000-000000000005', 'c0000000-0000-0000-0000-000000000001', 'ESP-015', 36.8058, 10.1805, 8.5, 720, 91, 0.9, 36.3);

-- 6. Sprints
INSERT INTO public.sprints (player_id, session_id, speed, duration, distance) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 26.4, 2.3, 18.5),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 28.1, 2.1, 17.2);

-- 7. Player loads
INSERT INTO public.player_loads (player_id, session_id, player_load, intensity) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 280, 'high'),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 265, 'high'),
  ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 240, 'moderate');

-- 8. Alertes
INSERT INTO public.alerts (player_id, session_id, type, message, is_read) VALUES
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 'acceleration', 'High Acceleration 3.2 m/s²', false),
  ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000001', 'deceleration', 'High Deceleration -3.1 m/s²', false),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'speed', 'Sprint peak 26.4 km/h', true);

-- ============================================================
-- OPTIONNEL — nécessite tables-v2.sql
-- Décommente si tu as exécuté tables-v2.sql
-- ============================================================
/*
INSERT INTO public.gateways (team_id, name, gateway_id, status) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Gateway Nord', 'GW-001', 'online'),
  ('a0000000-0000-0000-0000-000000000001', 'Gateway Sud', 'GW-002', 'online'),
  ('a0000000-0000-0000-0000-000000000001', 'Gateway Vestiaire', 'GW-003', 'online')
ON CONFLICT (gateway_id) DO NOTHING;

INSERT INTO public.speed_zone_stats (player_id, session_id, zone, duration_seconds, percentage) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1, 540, 10),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 2, 1350, 25),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 3, 1728, 32),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 4, 1134, 21),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 5, 648, 12)
ON CONFLICT (player_id, session_id, zone) DO NOTHING;

INSERT INTO public.heatmap_cells (player_id, session_id, grid_x, grid_y, intensity) VALUES
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 8, 5, 0.9),
  ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 9, 6, 0.7),
  ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 14, 4, 0.8)
ON CONFLICT (player_id, session_id, grid_x, grid_y) DO NOTHING;
*/
