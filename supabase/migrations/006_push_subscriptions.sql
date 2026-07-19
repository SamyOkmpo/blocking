-- ============================================================
-- Bloqueo — migración 6: notificaciones push (Web Push + Vercel Cron)
-- Ejecuta este archivo en el SQL Editor de Supabase DESPUÉS de 005.
-- ============================================================

-- El cron corre en el servidor (UTC): necesita saber la zona horaria de
-- cada usuario para comparar la hora local contra sus bloques.
alter table public.user_stats
  add column if not exists timezone text not null default 'UTC';

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- El usuario gestiona sus propias suscripciones (alta/baja desde el cliente)
create policy "own push_subscriptions" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- El cron de envío usa la service role key, que salta RLS por diseño de
-- Supabase — no hace falta una policy extra para leer entre usuarios.
