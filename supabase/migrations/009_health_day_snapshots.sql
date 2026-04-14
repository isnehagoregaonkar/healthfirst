-- Daily health / exercise aggregates synced from device (HealthKit / Health Connect).

create table if not exists public.exercise (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  day date not null,
  platform text not null check (platform in ('ios', 'android')),
  steps integer,
  active_energy_kcal numeric,
  avg_heart_rate_bpm integer,
  workout_count integer,
  sleep_segments_count integer,
  cycle_log_count integer,
  payload jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique (user_id, day, platform)
);

create index if not exists exercise_user_day_idx
  on public.exercise (user_id, day desc);

alter table public.exercise enable row level security;

drop policy if exists "Users insert own exercise rows" on public.exercise;
drop policy if exists "Users read own exercise rows" on public.exercise;
drop policy if exists "Users update own exercise rows" on public.exercise;

create policy "Users insert own exercise rows"
  on public.exercise
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users read own exercise rows"
  on public.exercise
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users update own exercise rows"
  on public.exercise
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
