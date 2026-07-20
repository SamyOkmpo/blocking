-- ============================================================
-- Bloqueo — migración 9: marcos de racha y títulos personalizados
-- ============================================================
-- Nuevas categorías de la tienda, cosméticas puras (se pagan con las
-- mismas monedas de racha 🪙): marcos que decoran la insignia de racha 🔥
-- del header, y títulos que reemplazan el nombre de nivel mostrado.

alter table public.user_stats
  add column if not exists unlocked_frames text[] not null default array['none'],
  add column if not exists active_frame text not null default 'none',
  add column if not exists unlocked_titles text[] not null default array['none'],
  add column if not exists active_title text not null default 'none';
