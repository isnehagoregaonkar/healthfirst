-- Allow users to update meal_items rows for their own meals (required for in-app edit).

create policy "Users update items for own meals"
  on public.meal_items
  for update
  to authenticated
  using (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.meals m
      where m.id = meal_id and m.user_id = auth.uid()
    )
  );
