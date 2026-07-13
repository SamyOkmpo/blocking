-- ============================================================
-- Bloqueo — migración 2: economía de gemas y recuperación de rachas
-- Ejecuta este archivo en el SQL Editor de Supabase DESPUÉS de 001.
-- (Es seguro ejecutarlo aunque ya exista alguna columna.)
-- ============================================================

alter table public.user_stats
  -- 💎 moneda ganada por bloques, días completos, logros y niveles
  add column if not exists gems int not null default 0,
  -- 🛡️ escudos equipados: se consumen solos para proteger la racha
  add column if not exists streak_shields int not null default 0,
  add column if not exists shields_used int not null default 0,
  -- ❤️‍🔥 reparación de racha: guarda la racha perdida y cuándo se perdió
  add column if not exists streaks_repaired int not null default 0,
  add column if not exists lost_streak int not null default 0,
  add column if not exists lost_streak_at timestamptz,
  -- contadores para logros especiales
  add column if not exists early_blocks int not null default 0,
  add column if not exists night_blocks int not null default 0,
  add column if not exists max_blocks_in_day int not null default 0;
