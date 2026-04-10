-- Run in Supabase SQL Editor or via CLI migrations.
-- Logs each add-water action; today's total = sum(amount_ml) for local-day filter in the app.

create table if not exists public.water_intakes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount_ml integer not null check (amount_ml > 0 and amount_ml <= 10000),
  created_at timestamptz not null default now()
);

create index if not exists water_intakes_user_created_idx
  on public.water_intakes (user_id, created_at desc);

alter table public.water_intakes enable row level security;

create policy "Users insert own water rows"
  on public.water_intakes
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users read own water rows"
  on public.water_intakes
  for select
  to authenticated
  using (auth.uid() = user_id);
