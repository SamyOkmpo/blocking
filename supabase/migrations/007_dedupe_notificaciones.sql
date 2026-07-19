-- ============================================================
-- Bloqueo — migración 7: dedupe de notificaciones push
-- Ejecuta este archivo en el SQL Editor de Supabase DESPUÉS de 006.
--
-- El cron ya no depende de correr exactamente en el minuto exacto (no
-- todos los disparadores externos lo garantizan): ahora el aviso se
-- considera "vencido" desde su minuto objetivo en adelante, y esta tabla
-- evita mandarlo dos veces el mismo día.
-- ============================================================

create table public.sent_push_notifications (
  tag text not null,
  date date not null,
  sent_at timestamptz not null default now(),
  primary key (tag, date)
);

alter table public.sent_push_notifications enable row level security;
-- Sin policies: solo el cron (service role, que salta RLS) la toca.
