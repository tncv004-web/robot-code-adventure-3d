-- Robot Code Adventure / ถอดรหัสหรรษา 3D
-- Tables are only accessed via server-side game-api with a Supabase secret key.
-- No direct anon/authenticated Data API access is granted.
create extension if not exists pgcrypto;

create table if not exists public.game_students (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 80),
  classroom text not null check (char_length(trim(classroom)) between 1 and 40),
  created_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.game_students(id) on delete cascade,
  token_hash text not null unique,
  mode text not null check (mode in ('worksheet','adventure')),
  challenge jsonb not null,
  next_mission smallint not null default 1 check (next_mission between 1 and 4),
  current_mistakes integer not null default 0 check (current_mistakes >= 0),
  mission_started_at timestamptz not null default now(),
  started_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '12 hours'),
  finished_at timestamptz,
  total_score integer not null default 0 check (total_score between 0 and 300)
);

create table if not exists public.game_mission_results (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.game_sessions(id) on delete cascade,
  mission_number smallint not null check (mission_number between 1 and 3),
  score integer not null check (score between 0 and 100),
  duration_seconds integer not null check (duration_seconds >= 0),
  mistakes integer not null default 0,
  completed_at timestamptz not null default now(),
  unique (session_id,mission_number)
);

create table if not exists public.game_teacher_access (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_at timestamptz not null default now()
);

create index if not exists game_sessions_student_idx on public.game_sessions(student_id);
create index if not exists game_sessions_finished_idx on public.game_sessions(finished_at desc) where finished_at is not null;
create index if not exists game_results_session_idx on public.game_mission_results(session_id);

alter table public.game_students enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_mission_results enable row level security;
alter table public.game_teacher_access enable row level security;

-- No RLS policies on purpose: all direct browser DB access is denied.
-- Only the backend Edge Function with secret privileges can use these tables.
revoke all on table public.game_students from anon, authenticated;
revoke all on table public.game_sessions from anon, authenticated;
revoke all on table public.game_mission_results from anon, authenticated;
revoke all on table public.game_teacher_access from anon, authenticated;
revoke all on sequence public.game_mission_results_id_seq from anon, authenticated;

-- Edge Function uses a server-only secret key. Explicitly grant the service_role
-- the minimum privileges needed; RLS remains enabled and anon/authenticated
-- retain no direct table access.
grant select, insert on table public.game_students to service_role;
grant select, insert, update on table public.game_sessions to service_role;
grant select, insert on table public.game_mission_results to service_role;
grant select on table public.game_teacher_access to service_role;
grant usage on sequence public.game_mission_results_id_seq to service_role;
