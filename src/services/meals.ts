import { supabase } from './supabase';

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealServiceError = Readonly<{
  message: string;
  code?: string;
}>;

export type MealItemRow = Readonly<{
  id: string;
  mealId: string;
  name: string;
  quantity: string;
  calories: number;
}>;

export type MealWithItems = Readonly<{
  id: string;
  mealType: MealType;
  createdAt: string;
  items: MealItemRow[];
  subtotalCalories: number;
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

type AddMealResult =
  | Readonly<{ ok: true; mealId: string }>
  | Readonly<{ ok: false; error: MealServiceError }>;

export type AddMealOptions = Readonly<{
  /** Local calendar day this meal belongs to (defaults to today). */
  day?: Date;
}>;

/**
 * Creates an empty meal row. Uses `now` on the device's local "today", or noon local on other days.
 */
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

/**
 * Adds one food line to an existing meal (must belong to the signed-in user via RLS).
 */
export async function addMealItem(
  mealId: string,
  name: string,
  quantity: string,
  calories: number,
): Promise<AddItemResult> {
  const trimmed = name.trim();
  if (!trimmed) {
    return { ok: false, error: { message: 'Food name is required' } };
  }
  if (!Number.isFinite(calories) || calories < 0 || calories > 50_000) {
    return { ok: false, error: { message: 'Calories must be between 0 and 50000' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const { error } = await supabase.from('meal_items').insert({
    meal_id: mealId.trim(),
    name: trimmed,
    quantity: quantity.trim(),
    calories: Math.round(calories),
  });

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  return { ok: true };
}

type GetMealsTodayResult =
  | Readonly<{ meals: MealWithItems[]; totalCalories: number }>
  | Readonly<{ error: MealServiceError }>;

/**
 * All meals for the current user on a given local calendar day,
 * each with nested items. Sorted by time ascending.
 */
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
    .select('id, meal_id, name, quantity, calories')
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

/** @deprecated Use getMealsForLocalDay(new Date()). */
export async function getMealsForToday(): Promise<GetMealsTodayResult> {
  return getMealsForLocalDay(new Date());
}
