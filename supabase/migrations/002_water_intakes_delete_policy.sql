-- Allow users to remove mistaken intake rows (app sends delete by id; RLS enforces ownership).

create policy "Users delete own water rows"
  on public.water_intakes
  for delete
  to authenticated
  using (auth.uid() = user_id);
