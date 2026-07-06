-- ============================================================
-- Bloqueo — esquema inicial
-- Ejecuta este archivo completo en el SQL Editor de Supabase
-- (Dashboard → SQL Editor → New query → pegar → Run)
-- ============================================================

-- ------------------------------------------------------------
-- 1. Bloques de tiempo (plantillas, pueden repetirse)
-- ------------------------------------------------------------
create table public.time_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  start_time time not null,
  end_time time not null,
  -- 'once'  → solo el día indicado en `date`
  -- 'daily' → todos los días
  -- 'weekly'→ los días marcados en days_of_week (0 = domingo … 6 = sábado)
  recurrence_type text not null default 'once'
    check (recurrence_type in ('once', 'daily', 'weekly')),
  days_of_week smallint[] not null default '{}',
  date date, -- solo aplica cuando recurrence_type = 'once'
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  constraint valid_range check (end_time > start_time),
  constraint once_has_date check (recurrence_type <> 'once' or date is not null)
);

create index time_blocks_user_idx on public.time_blocks (user_id) where not is_archived;

-- ------------------------------------------------------------
-- 2. Tareas (checklist plantilla de cada bloque)
-- ------------------------------------------------------------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  time_block_id uuid not null references public.time_blocks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index tasks_block_idx on public.tasks (time_block_id);

-- ------------------------------------------------------------
-- 3. Sesiones: la instancia de un bloque en un día concreto.
--    Como los bloques se repiten, el estado de completado vive
--    aquí y no en el bloque/tarea plantilla.
-- ------------------------------------------------------------
create table public.block_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  time_block_id uuid not null references public.time_blocks (id) on delete cascade,
  date date not null,
  status text not null default 'active'
    check (status in ('active', 'completed', 'failed')),
  completed_at timestamptz,
  xp_earned int not null default 0,
  was_perfect boolean not null default false,
  created_at timestamptz not null default now(),
  unique (time_block_id, date)
);

create index block_sessions_user_date_idx on public.block_sessions (user_id, date);

-- Tareas marcadas dentro de una sesión concreta
create table public.task_completions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.block_sessions (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  completed_at timestamptz not null default now(),
  unique (session_id, task_id)
);

create index task_completions_session_idx on public.task_completions (session_id);

-- ------------------------------------------------------------
-- 4. Estadísticas y gamificación del usuario
-- ------------------------------------------------------------
create table public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  current_streak int not null default 0,
  longest_streak int not null default 0,
  total_xp int not null default 0,
  level int not null default 1,
  total_tasks_completed int not null default 0,
  total_blocks_completed int not null default 0,
  perfect_blocks int not null default 0,
  last_streak_date date, -- último día que contó para la racha
  updated_at timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 5. Logros desbloqueados
-- ------------------------------------------------------------
create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  achievement_type text not null,
  unlocked_at timestamptz not null default now(),
  unique (user_id, achievement_type)
);

-- ------------------------------------------------------------
-- 6. Crear user_stats automáticamente al registrarse
-- ------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_stats (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------
-- 7. Row Level Security: cada usuario solo ve/toca lo suyo
-- ------------------------------------------------------------
alter table public.time_blocks enable row level security;
alter table public.tasks enable row level security;
alter table public.block_sessions enable row level security;
alter table public.task_completions enable row level security;
alter table public.user_stats enable row level security;
alter table public.achievements enable row level security;

create policy "own time_blocks" on public.time_blocks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own block_sessions" on public.block_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own task_completions" on public.task_completions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own user_stats" on public.user_stats
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own achievements" on public.achievements
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
