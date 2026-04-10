-- Paste in Supabase SQL Editor (same as migration 004_meal_items_macros.sql).

alter table public.meal_items
  add column if not exists usda_fdc_id bigint,
  add column if not exists protein_g numeric(10, 2),
  add column if not exists carbs_g numeric(10, 2),
  add column if not exists fat_g numeric(10, 2),
  add column if not exists fiber_g numeric(10, 2);

comment on column public.meal_items.usda_fdc_id is 'FoodData Central FDC ID when logged from USDA search';
