-- ============================================================
-- Bloqueo — migración 3: cofre diario y racha amable
-- Ejecuta este archivo en el SQL Editor de Supabase DESPUÉS de 002.
-- ============================================================

alter table public.user_stats
  -- último día con AL MENOS un bloque completado (mantiene viva la llama)
  add column if not exists last_active_date date,
  -- 🎁 cofres diarios abiertos (primer bloque de cada día)
  add column if not exists chests_opened int not null default 0,
  -- 🌱 regresos: primer bloque completado después de perder una racha
  add column if not exists comebacks int not null default 0;

-- 🛡️ Escudo de bienvenida: todos empiezan con uno gratis
alter table public.user_stats alter column streak_shields set default 1;
update public.user_stats set streak_shields = 1 where streak_shields = 0;
