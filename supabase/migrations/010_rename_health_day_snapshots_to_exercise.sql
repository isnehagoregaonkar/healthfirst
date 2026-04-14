-- Rename old table health_day_snapshots to exercise while preserving data and constraints.

do $$
begin
  if to_regclass('public.health_day_snapshots') is not null
     and to_regclass('public.exercise') is null then
    alter table public.health_day_snapshots rename to exercise;
  end if;
end $$;

-- Ensure index name is aligned (safe no-op if already renamed/exists).
do $$
begin
  if to_regclass('public.health_day_snapshots_user_day_idx') is not null
     and to_regclass('public.exercise_user_day_idx') is null then
    alter index public.health_day_snapshots_user_day_idx rename to exercise_user_day_idx;
  end if;
end $$;

-- Recreate canonical policy names on exercise table.
drop policy if exists "Users insert own health day snapshots" on public.exercise;
drop policy if exists "Users read own health day snapshots" on public.exercise;
drop policy if exists "Users update own health day snapshots" on public.exercise;

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
