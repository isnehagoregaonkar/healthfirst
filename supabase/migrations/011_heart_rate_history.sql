-- Historical heart-rate readings from manual input and connected health data.

create table if not exists public.heart_rate_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bpm integer not null check (bpm >= 35 and bpm <= 220),
  recorded_at timestamptz not null,
  source text not null check (source in ('manual', 'health_connect', 'healthkit')),
  created_at timestamptz not null default now(),
  unique (user_id, source, recorded_at)
);

create index if not exists heart_rate_history_user_recorded_idx
  on public.heart_rate_history (user_id, recorded_at desc);

alter table public.heart_rate_history enable row level security;

drop policy if exists "Users insert own heart rate history rows" on public.heart_rate_history;
drop policy if exists "Users read own heart rate history rows" on public.heart_rate_history;
drop policy if exists "Users update own heart rate history rows" on public.heart_rate_history;

create policy "Users insert own heart rate history rows"
  on public.heart_rate_history
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users read own heart rate history rows"
  on public.heart_rate_history
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users update own heart rate history rows"
  on public.heart_rate_history
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

insert into public.heart_rate_history (user_id, bpm, recorded_at, source)
select
  user_id,
  bpm,
  recorded_at,
  case
    when source in ('manual', 'health_connect', 'healthkit') then source
    else 'manual'
  end
from public.heart_rate_readings
on conflict (user_id, source, recorded_at) do nothing;
