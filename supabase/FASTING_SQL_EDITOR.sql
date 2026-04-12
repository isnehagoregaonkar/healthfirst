-- Paste into Supabase Dashboard → SQL → New query → Run.
-- Creates fasting_sessions (completed fasts) with RLS like water_intakes / meals.

create table if not exists public.fasting_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz not null,
  target_fast_hours smallint not null
    check (target_fast_hours >= 12 and target_fast_hours <= 24),
  duration_minutes integer not null
    check (duration_minutes > 0 and duration_minutes <= 48 * 60),
  created_at timestamptz not null default now()
);

create index if not exists fasting_sessions_user_ended_idx
  on public.fasting_sessions (user_id, ended_at desc);

alter table public.fasting_sessions enable row level security;

create policy "Users insert own fasting_sessions"
  on public.fasting_sessions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users read own fasting_sessions"
  on public.fasting_sessions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own fasting_sessions"
  on public.fasting_sessions
  for delete
  to authenticated
  using (auth.uid() = user_id);
