-- Body metrics for calorie targets (syncs across devices). Run in SQL Editor if not using CLI migrations.

create table if not exists public.user_body_profile (
  user_id uuid primary key references auth.users (id) on delete cascade,
  weight_kg double precision not null,
  goal_weight_kg double precision not null,
  height_cm double precision not null,
  age integer not null check (age >= 14 and age <= 100),
  sex text not null check (sex in ('male', 'female')),
  updated_at timestamptz not null default now()
);

create index if not exists user_body_profile_updated_idx
  on public.user_body_profile (user_id, updated_at desc);

alter table public.user_body_profile enable row level security;

create policy "Users read own body profile"
  on public.user_body_profile
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert own body profile"
  on public.user_body_profile
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own body profile"
  on public.user_body_profile
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
