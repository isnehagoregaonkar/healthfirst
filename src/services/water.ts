import { supabase } from './supabase';

export const DEFAULT_DAILY_GOAL_ML = 3000;

export type WaterServiceError = Readonly<{
  message: string;
  code?: string;
}>;

type AddWaterResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: WaterServiceError }>;

type TodayTotalResult =
  | Readonly<{ totalMl: number }>
  | Readonly<{ error: WaterServiceError }>;

function localDayBoundsIsoFor(day: Date): Readonly<{ startIso: string; endIso: string }> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

async function requireUserId(): Promise<{ userId: string } | { error: WaterServiceError }> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { error: { message: error.message, code: error.name } };
  }
  if (!data.user) {
    return { error: { message: 'Not signed in' } };
  }
  return { userId: data.user.id };
}

/**
 * Records a water intake row for the signed-in user.
 */
export async function addWaterIntake(amountMl: number): Promise<AddWaterResult> {
  if (!Number.isFinite(amountMl) || amountMl <= 0 || amountMl > 10_000) {
    return { ok: false, error: { message: 'Amount must be between 1 and 10000 ml' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const { error } = await supabase.from('water_intakes').insert({
    user_id: user.userId,
    amount_ml: Math.round(amountMl),
  });

  if (error) {
    return {
      ok: false,
      error: { message: error.message, code: error.code },
    };
  }

  return { ok: true };
}

/**
 * Sums `amount_ml` for the current user on a given local calendar day.
 */
export async function getTotalMlForLocalDay(day: Date): Promise<TodayTotalResult> {
  const user = await requireUserId();
  if ('error' in user) {
    return { error: user.error };
  }

  const { startIso, endIso } = localDayBoundsIsoFor(day);

  const { data, error } = await supabase
    .from('water_intakes')
    .select('amount_ml')
    .eq('user_id', user.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  const totalMl = (data ?? []).reduce((sum, row) => sum + Number(row.amount_ml), 0);
  return { totalMl };
}

/** Convenience: totals for today in the device’s local timezone. */
export async function getTodayTotalMl(): Promise<TodayTotalResult> {
  return getTotalMlForLocalDay(new Date());
}
