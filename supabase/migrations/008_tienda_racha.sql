-- ============================================================
-- Bloqueo — migración 8: tienda de temas con monedas de racha
-- ============================================================
-- Cada día que la racha crece gana 1 moneda de racha 🪙🔥. Se gastan en
-- temas cosméticos (solo colores de acento) — no afectan XP, racha ni
-- ninguna otra mecánica de juego.

alter table public.user_stats
  add column if not exists streak_coins integer not null default 0,
  add column if not exists unlocked_themes text[] not null default array['violet'],
  add column if not exists active_theme text not null default 'violet';
