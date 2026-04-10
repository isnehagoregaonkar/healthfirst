-- Meals + items per user; RLS scoped to auth.uid().

create table if not exists public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  created_at timestamptz not null default now()
);

create table if not exists public.meal_items (
  id uuid primary key default gen_random_uuid(),
  meal_id uuid not null references public.meals (id) on delete cascade,
  name text not null,
  quantity text not null default '',
  calories integer not null default 0 check (calories >= 0)
);

create index if not exists meals_user_created_idx
  on public.meals (user_id, created_at desc);

create index if not exists meal_items_meal_id_idx
  on public.meal_items (meal_id);

alter table public.meals enable row level security;
alter table public.meal_items enable row level security;

create policy "Users insert own meals"
  on public.meals
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users select own meals"
  on public.meals
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users delete own meals"
  on public.meals
  for delete
  to authenticated
  using (auth.uid() = user_id);

create policy "Users insert items for own meals"
  on public.meal_items
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "Users select items for own meals"
  on public.meal_items
  for select
  to authenticated
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );

create policy "Users delete items for own meals"
  on public.meal_items
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );
