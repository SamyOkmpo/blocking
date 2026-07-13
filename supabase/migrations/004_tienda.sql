-- ============================================================
-- Bloqueo — migración 4: tienda (impulso de XP)
-- ============================================================

alter table public.user_stats
  -- ⚡ día con impulso ×2 de XP activo (comprado en la tienda)
  add column if not exists xp_boost_date date;
