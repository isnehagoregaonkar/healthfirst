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

export type WaterIntakeEntry = Readonly<{
  id: string;
  amountMl: number;
  createdAt: string;
}>;

/** Start of each local calendar day, oldest first. */
export type WaterDayTotal = Readonly<{
  date: Date;
  totalMl: number;
}>;

type WaterDaySnapshotResult =
  | Readonly<{ entries: WaterIntakeEntry[]; totalMl: number }>
  | Readonly<{ error: WaterServiceError }>;

type DeleteWaterResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: WaterServiceError }>;

function localDayBoundsIsoFor(day: Date): Readonly<{ startIso: string; endIso: string }> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function startOfLocalDayWater(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addCalendarDaysWater(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}

function localDateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localDateKeyFromCreatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return localDateKeyFromDate(d);
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
 * Fetches intake rows for a local calendar day (newest first) and the day total.
 */
export async function getWaterDaySnapshot(day: Date): Promise<WaterDaySnapshotResult> {
  const user = await requireUserId();
  if ('error' in user) {
    return { error: user.error };
  }

  const { startIso, endIso } = localDayBoundsIsoFor(day);

  const { data, error } = await supabase
    .from('water_intakes')
    .select('id, amount_ml, created_at')
    .eq('user_id', user.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  const rows = data ?? [];
  const entries: WaterIntakeEntry[] = rows.map((row) => ({
    id: String(row.id),
    amountMl: Number(row.amount_ml),
    createdAt: String(row.created_at),
  }));
  const totalMl = entries.reduce((sum, e) => sum + e.amountMl, 0);
  return { entries, totalMl };
}

type WaterRangeTotalsResult =
  | Readonly<{ days: WaterDayTotal[] }>
  | Readonly<{ error: WaterServiceError }>;

/**
 * Daily totals for a sliding window of local days ending on `endDay` (inclusive).
 * `days[0]` is the oldest day; `days[days.length - 1]` is `endDay`.
 */
export async function getWaterDailyTotalsForRange(
  endDay: Date,
  numDays: number,
): Promise<WaterRangeTotalsResult> {
  const n = Math.floor(numDays);
  if (n < 1 || n > 31) {
    return { error: { message: 'Invalid range' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { error: user.error };
  }

  const endStart = startOfLocalDayWater(endDay);
  const firstStart = addCalendarDaysWater(endStart, -(n - 1));
  const { startIso } = localDayBoundsIsoFor(firstStart);
  const { endIso } = localDayBoundsIsoFor(endStart);

  const { data, error } = await supabase
    .from('water_intakes')
    .select('amount_ml, created_at')
    .eq('user_id', user.userId)
    .gte('created_at', startIso)
    .lte('created_at', endIso);

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  const totalsByKey = new Map<string, number>();
  for (let i = 0; i < n; i += 1) {
    const d = addCalendarDaysWater(firstStart, i);
    totalsByKey.set(localDateKeyFromDate(d), 0);
  }

  for (const row of data ?? []) {
    const key = localDateKeyFromCreatedAt(String(row.created_at));
    if (!key || !totalsByKey.has(key)) {
      continue;
    }
    totalsByKey.set(key, (totalsByKey.get(key) ?? 0) + Number(row.amount_ml));
  }

  const days: WaterDayTotal[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = addCalendarDaysWater(firstStart, i);
    const key = localDateKeyFromDate(d);
    days.push({ date: d, totalMl: totalsByKey.get(key) ?? 0 });
  }

  return { days };
}

/**
 * Deletes one intake row owned by the signed-in user.
 */
export async function deleteWaterIntake(entryId: string): Promise<DeleteWaterResult> {
  const trimmed = entryId.trim();
  if (!trimmed) {
    return { ok: false, error: { message: 'Invalid entry' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const { error, count } = await supabase
    .from('water_intakes')
    .delete({ count: 'exact' })
    .eq('id', trimmed)
    .eq('user_id', user.userId);

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  if ((count ?? 0) < 1) {
    return {
      ok: false,
      error: {
        message:
          'Could not delete this entry. If this keeps happening, apply the water delete policy migration in Supabase.',
      },
    };
  }

  return { ok: true };
}

/**
 * Sums `amount_ml` for the current user on a given local calendar day.
 */
export async function getTotalMlForLocalDay(day: Date): Promise<TodayTotalResult> {
  const snap = await getWaterDaySnapshot(day);
  if ('error' in snap) {
    return { error: snap.error };
  }
  return { totalMl: snap.totalMl };
}

/** Convenience: totals for today in the device’s local timezone. */
export async function getTodayTotalMl(): Promise<TodayTotalResult> {
  return getTotalMlForLocalDay(new Date());
}
