-- ============================================================
-- Bloqueo — actualización TODO-EN-UNO (migraciones 002 + 003)
-- Para bases que ya ejecutaron 001_init.sql.
-- Es idempotente: puedes ejecutarlo las veces que quieras.
-- ============================================================

alter table public.user_stats
  -- 💎 moneda ganada por bloques, días completos, logros y niveles
  add column if not exists gems int not null default 0,
  -- 🛡️ escudos equipados: se consumen solos para proteger la racha
  add column if not exists streak_shields int not null default 0,
  add column if not exists shields_used int not null default 0,
  -- ❤️‍🔥 recuperación de racha: guarda la racha perdida y cuándo se perdió
  add column if not exists streaks_repaired int not null default 0,
  add column if not exists lost_streak int not null default 0,
  add column if not exists lost_streak_at timestamptz,
  -- contadores para logros especiales
  add column if not exists early_blocks int not null default 0,
  add column if not exists night_blocks int not null default 0,
  add column if not exists max_blocks_in_day int not null default 0,
  -- último día con AL MENOS un bloque completado (mantiene viva la llama)
  add column if not exists last_active_date date,
  -- 🎁 cofres diarios abiertos (primer bloque de cada día)
  add column if not exists chests_opened int not null default 0,
  -- 🌱 regresos: primer bloque completado después de perder una racha
  add column if not exists comebacks int not null default 0,
  -- ⚡ día con impulso ×2 de XP activo (comprado en la tienda)
  add column if not exists xp_boost_date date;

-- 🛡️ Escudo de bienvenida: todos empiezan con uno gratis
alter table public.user_stats alter column streak_shields set default 1;
update public.user_stats set streak_shields = 1 where streak_shields = 0;
