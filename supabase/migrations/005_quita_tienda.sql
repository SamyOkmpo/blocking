-- ============================================================
-- Bloqueo — migración 5: quita la tienda (gemas, cofres, impulso de XP)
-- Ejecuta este archivo en el SQL Editor de Supabase DESPUÉS de 004.
-- Los protectores de racha (streak_shields) se quedan: ahora se ganan
-- solos cada semana de racha en vez de comprarse con gemas.
-- ============================================================

alter table public.user_stats
  drop column if exists gems,
  drop column if exists chests_opened,
  drop column if exists xp_boost_date;
