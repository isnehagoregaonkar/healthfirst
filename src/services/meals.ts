import { supabase } from './supabase';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealServiceError = Readonly<{
  message: string;
  code?: string;
}>;

export type LogMealItemPayload = Readonly<{
  name: string;
  quantity: string;
  calories: number;
  usdaFdcId?: number | null;
  proteinG?: number | null;
  carbsG?: number | null;
  fatG?: number | null;
  fiberG?: number | null;
}>;

export type MealItemRow = Readonly<{
  id: string;
  mealId: string;
  name: string;
  quantity: string;
  calories: number;
  usdaFdcId: number | null;
  proteinG: number | null;
  carbsG: number | null;
  fatG: number | null;
  fiberG: number | null;
}>;

export type MealWithItems = Readonly<{
  id: string;
  mealType: MealType;
  createdAt: string;
  items: MealItemRow[];
  subtotalCalories: number;
}>;

export type DayMacroTotals = Readonly<{
  proteinG: number;
  carbsG: number;
  fatG: number;
  fiberG: number;
}>;

const MEAL_TYPES: ReadonlySet<string> = new Set(['breakfast', 'lunch', 'dinner', 'snack']);

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfLocalDay(d: Date): Date {
  const x = startOfLocalDay(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function localDayBoundsFor(day: Date): Readonly<{ startIso: string; endIso: string }> {
  return {
    startIso: startOfLocalDay(day).toISOString(),
    endIso: endOfLocalDay(day).toISOString(),
  };
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

async function requireUserId(): Promise<{ userId: string } | { error: MealServiceError }> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { error: { message: error.message, code: error.name } };
  }
  if (!data.user) {
    return { error: { message: 'Not signed in' } };
  }
  return { userId: data.user.id };
}

function isMealType(v: string): v is MealType {
  return MEAL_TYPES.has(v);
}

function roundMacro(n: number): number {
  return Math.round(n * 10) / 10;
}

type AddMealResult =
  | Readonly<{ ok: true; mealId: string }>
  | Readonly<{ ok: false; error: MealServiceError }>;

export type AddMealOptions = Readonly<{
  day?: Date;
}>;

export async function addMeal(mealType: MealType, options?: AddMealOptions): Promise<AddMealResult> {
  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const anchor = options?.day ? startOfLocalDay(options.day) : startOfLocalDay(new Date());
  const now = new Date();
  const createdAt = isSameLocalDay(anchor, now)
    ? now.toISOString()
    : (() => {
        const t = new Date(anchor);
        t.setHours(12, 0, 0, 0);
        return t.toISOString();
      })();

  const { data, error } = await supabase
    .from('meals')
    .insert({
      user_id: user.userId,
      meal_type: mealType,
      created_at: createdAt,
    })
    .select('id')
    .single();

  if (error || !data?.id) {
    return {
      ok: false,
      error: { message: error?.message ?? 'Could not create meal', code: error?.code },
    };
  }

  return { ok: true, mealId: String(data.id) };
}

type AddItemResult = Readonly<{ ok: true }> | Readonly<{ ok: false; error: MealServiceError }>;

export async function addMealItem(mealId: string, item: LogMealItemPayload): Promise<AddItemResult> {
  const trimmed = item.name.trim();
  if (!trimmed) {
    return { ok: false, error: { message: 'Food name is required' } };
  }
  const cal = item.calories;
  if (!Number.isFinite(cal) || cal < 0 || cal > 50_000) {
    return { ok: false, error: { message: 'Calories must be between 0 and 50000' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const row: Record<string, unknown> = {
    meal_id: mealId.trim(),
    name: trimmed,
    quantity: item.quantity.trim(),
    calories: Math.round(cal),
  };

  if (item.usdaFdcId != null && Number.isFinite(item.usdaFdcId)) {
    row.usda_fdc_id = Math.round(item.usdaFdcId);
  }
  if (item.proteinG != null && Number.isFinite(item.proteinG)) {
    row.protein_g = roundMacro(item.proteinG);
  }
  if (item.carbsG != null && Number.isFinite(item.carbsG)) {
    row.carbs_g = roundMacro(item.carbsG);
  }
  if (item.fatG != null && Number.isFinite(item.fatG)) {
    row.fat_g = roundMacro(item.fatG);
  }
  if (item.fiberG != null && Number.isFinite(item.fiberG)) {
    row.fiber_g = roundMacro(item.fiberG);
  }

  const { error } = await supabase.from('meal_items').insert(row);

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  return { ok: true };
}

export async function updateMealItem(itemId: string, item: LogMealItemPayload): Promise<AddItemResult> {
  const trimmed = item.name.trim();
  if (!trimmed) {
    return { ok: false, error: { message: 'Food name is required' } };
  }
  const cal = item.calories;
  if (!Number.isFinite(cal) || cal < 0 || cal > 50_000) {
    return { ok: false, error: { message: 'Calories must be between 0 and 50000' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const row: Record<string, unknown> = {
    name: trimmed,
    quantity: item.quantity.trim(),
    calories: Math.round(cal),
    usda_fdc_id:
      item.usdaFdcId != null && Number.isFinite(item.usdaFdcId) ? Math.round(item.usdaFdcId) : null,
  };

  if (item.proteinG != null && Number.isFinite(item.proteinG)) {
    row.protein_g = roundMacro(item.proteinG);
  } else {
    row.protein_g = null;
  }
  if (item.carbsG != null && Number.isFinite(item.carbsG)) {
    row.carbs_g = roundMacro(item.carbsG);
  } else {
    row.carbs_g = null;
  }
  if (item.fatG != null && Number.isFinite(item.fatG)) {
    row.fat_g = roundMacro(item.fatG);
  } else {
    row.fat_g = null;
  }
  if (item.fiberG != null && Number.isFinite(item.fiberG)) {
    row.fiber_g = roundMacro(item.fiberG);
  } else {
    row.fiber_g = null;
  }

  const { error } = await supabase.from('meal_items').update(row).eq('id', itemId.trim());

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  return { ok: true };
}

type DeleteResult = Readonly<{ ok: true }> | Readonly<{ ok: false; error: MealServiceError }>;

export async function deleteMealItem(itemId: string): Promise<DeleteResult> {
  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const { error } = await supabase.from('meal_items').delete().eq('id', itemId.trim());

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  return { ok: true };
}

/** Deletes the meal row (items cascade). Caller should own the meal via RLS. */
export async function deleteMeal(mealId: string): Promise<DeleteResult> {
  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const { error } = await supabase.from('meals').delete().eq('id', mealId.trim());

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  return { ok: true };
}

/**
 * After removing the last item, remove the empty meal so the slot disappears.
 */
export async function deleteMealIfEmpty(mealId: string): Promise<void> {
  const { count, error } = await supabase
    .from('meal_items')
    .select('id', { count: 'exact', head: true })
    .eq('meal_id', mealId.trim());

  if (error || (count ?? 0) > 0) {
    return;
  }

  await supabase.from('meals').delete().eq('id', mealId.trim());
}

type GetMealsTodayResult =
  | Readonly<{ meals: MealWithItems[]; totalCalories: number }>
  | Readonly<{ error: MealServiceError }>;

export async function getMealsForLocalDay(day: Date): Promise<GetMealsTodayResult> {
  const user = await requireUserId();
  if ('error' in user) {
    return { error: user.error };
  }

  const { startIso, endIso } = localDayBoundsFor(day);

  const { data: mealRows, error: mealsError } = await supabase
    .from('meals')
    .select('id, meal_type, created_at')
    .eq('user_id', user.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: true });

  if (mealsError) {
    return { error: { message: mealsError.message, code: mealsError.code } };
  }

  const meals = mealRows ?? [];
  if (meals.length === 0) {
    return { meals: [], totalCalories: 0 };
  }

  const mealIds = meals.map((m) => String(m.id));

  const { data: itemRows, error: itemsError } = await supabase
    .from('meal_items')
    .select(
      'id, meal_id, name, quantity, calories, usda_fdc_id, protein_g, carbs_g, fat_g, fiber_g',
    )
    .in('meal_id', mealIds);

  if (itemsError) {
    return { error: { message: itemsError.message, code: itemsError.code } };
  }

  const byMeal = new Map<string, MealItemRow[]>();
  for (const id of mealIds) {
    byMeal.set(id, []);
  }

  for (const row of itemRows ?? []) {
    const mid = String(row.meal_id);
    const list = byMeal.get(mid);
    if (!list) {
      continue;
    }
    list.push({
      id: String(row.id),
      mealId: mid,
      name: String(row.name),
      quantity: String(row.quantity ?? ''),
      calories: Number(row.calories),
      usdaFdcId: row.usda_fdc_id != null ? Number(row.usda_fdc_id) : null,
      proteinG: row.protein_g != null ? Number(row.protein_g) : null,
      carbsG: row.carbs_g != null ? Number(row.carbs_g) : null,
      fatG: row.fat_g != null ? Number(row.fat_g) : null,
      fiberG: row.fiber_g != null ? Number(row.fiber_g) : null,
    });
  }

  let totalCalories = 0;
  const result: MealWithItems[] = meals.map((m) => {
    const id = String(m.id);
    const typeRaw = String(m.meal_type);
    const mealType: MealType = isMealType(typeRaw) ? typeRaw : 'snack';
    const items = byMeal.get(id) ?? [];
    const subtotalCalories = items.reduce((s, it) => s + it.calories, 0);
    totalCalories += subtotalCalories;
    return {
      id,
      mealType,
      createdAt: String(m.created_at),
      items,
      subtotalCalories,
    };
  });

  return { meals: result, totalCalories };
}

export async function getMealsForToday(): Promise<GetMealsTodayResult> {
  return getMealsForLocalDay(new Date());
}

function addCalendarDaysMeals(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}

function localDateKeyFromDateMeals(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localDateKeyFromIsoMeals(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return localDateKeyFromDateMeals(d);
}

export type MealDaySummary = Readonly<{
  date: Date;
  totalCalories: number;
  macroTotals: DayMacroTotals;
}>;

type MealRangeResult =
  | Readonly<{ days: MealDaySummary[] }>
  | Readonly<{ error: MealServiceError }>;

/**
 * Per-local-day calories and macro sums across `numDays` ending on `endDay` (inclusive).
 * `days[0]` is the oldest day.
 */
export async function getMealDaySummariesForRange(endDay: Date, numDays: number): Promise<MealRangeResult> {
  const n = Math.floor(numDays);
  if (n < 1 || n > 31) {
    return { error: { message: 'Invalid range' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { error: user.error };
  }

  const endStart = startOfLocalDay(endDay);
  const firstStart = addCalendarDaysMeals(endStart, -(n - 1));
  const { startIso } = localDayBoundsFor(firstStart);
  const { endIso } = localDayBoundsFor(endDay);

  const { data: mealRows, error: mealsError } = await supabase
    .from('meals')
    .select('id, created_at')
    .eq('user_id', user.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (mealsError) {
    return { error: { message: mealsError.message, code: mealsError.code } };
  }

  const meals = mealRows ?? [];
  const mealIds = meals.map((m) => String(m.id));
  const mealIdToDayKey = new Map<string, string>();
  for (const m of meals) {
    const key = localDateKeyFromIsoMeals(String(m.created_at));
    if (key) {
      mealIdToDayKey.set(String(m.id), key);
    }
  }

  const totalsByKey = new Map<
    string,
    { kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG: number }
  >();
  for (let i = 0; i < n; i += 1) {
    const d = addCalendarDaysMeals(firstStart, i);
    totalsByKey.set(localDateKeyFromDateMeals(d), {
      kcal: 0,
      proteinG: 0,
      carbsG: 0,
      fatG: 0,
      fiberG: 0,
    });
  }

  if (mealIds.length > 0) {
    const { data: itemRows, error: itemsError } = await supabase
      .from('meal_items')
      .select('meal_id, calories, protein_g, carbs_g, fat_g, fiber_g')
      .in('meal_id', mealIds);

    if (itemsError) {
      return { error: { message: itemsError.message, code: itemsError.code } };
    }

    for (const row of itemRows ?? []) {
      const mid = String(row.meal_id);
      const dayKey = mealIdToDayKey.get(mid);
      if (!dayKey || !totalsByKey.has(dayKey)) {
        continue;
      }
      const bucket = totalsByKey.get(dayKey)!;
      bucket.kcal += Number(row.calories) || 0;
      bucket.proteinG += row.protein_g != null ? Number(row.protein_g) : 0;
      bucket.carbsG += row.carbs_g != null ? Number(row.carbs_g) : 0;
      bucket.fatG += row.fat_g != null ? Number(row.fat_g) : 0;
      bucket.fiberG += row.fiber_g != null ? Number(row.fiber_g) : 0;
    }
  }

  const days: MealDaySummary[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = addCalendarDaysMeals(firstStart, i);
    const key = localDateKeyFromDateMeals(d);
    const t = totalsByKey.get(key)!;
    days.push({
      date: d,
      totalCalories: Math.round(t.kcal),
      macroTotals: {
        proteinG: roundMacro(t.proteinG),
        carbsG: roundMacro(t.carbsG),
        fatG: roundMacro(t.fatG),
        fiberG: roundMacro(t.fiberG),
      },
    });
  }

  return { days };
}
