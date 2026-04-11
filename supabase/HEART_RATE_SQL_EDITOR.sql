-- Paste into Supabase SQL Editor if migration 006 is not applied yet.

create table if not exists public.heart_rate_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bpm integer not null check (bpm >= 35 and bpm <= 220),
  recorded_at timestamptz not null default now(),
  source text not null default 'manual'
);

create index if not exists heart_rate_readings_user_recorded_idx
  on public.heart_rate_readings (user_id, recorded_at desc);

alter table public.heart_rate_readings enable row level security;

drop policy if exists "Users insert own heart rate rows" on public.heart_rate_readings;
drop policy if exists "Users read own heart rate rows" on public.heart_rate_readings;

create policy "Users insert own heart rate rows"
  on public.heart_rate_readings
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users read own heart rate rows"
  on public.heart_rate_readings
  for select
  to authenticated
  using (auth.uid() = user_id);
