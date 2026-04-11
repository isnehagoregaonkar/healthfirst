import { supabase } from './supabase';

export type VitalsServiceError = Readonly<{
  message: string;
  code?: string;
}>;

export type HeartRateReading = Readonly<{
  id: string;
  bpm: number;
  recordedAt: string;
}>;

type AddHeartRateResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: VitalsServiceError }>;

async function requireUserId(): Promise<{ userId: string } | { error: VitalsServiceError }> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { error: { message: error.message, code: error.name } };
  }
  if (!data.user) {
    return { error: { message: 'Not signed in' } };
  }
  return { userId: data.user.id };
}

function startOfLocalDayVitals(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addCalendarDaysVitals(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  x.setHours(0, 0, 0, 0);
  return x;
}

function localDayBoundsIsoVitals(day: Date): Readonly<{ startIso: string; endIso: string }> {
  const start = new Date(day);
  start.setHours(0, 0, 0, 0);
  const end = new Date(day);
  end.setHours(23, 59, 59, 999);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function localDateKeyFromDateVitals(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function localDateKeyFromIsoVitals(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return localDateKeyFromDateVitals(d);
}

export type HeartRateDayBucket = Readonly<{
  date: Date;
  /** Average BPM that day, or null if no readings */
  avgBpm: number | null;
}>;

type HeartRangeResult = Readonly<{ days: HeartRateDayBucket[] }> | Readonly<{ error: VitalsServiceError }>;

export async function getLatestHeartRateReading(): Promise<
  Readonly<{ reading: HeartRateReading | null }> | Readonly<{ error: VitalsServiceError }>
> {
  const user = await requireUserId();
  if ('error' in user) {
    return { error: user.error };
  }

  const { data, error } = await supabase
    .from('heart_rate_readings')
    .select('id, bpm, recorded_at')
    .eq('user_id', user.userId)
    .order('recorded_at', { ascending: false })
    .limit(1);

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  const row = data?.[0];
  if (!row) {
    return { reading: null };
  }

  return {
    reading: {
      id: String(row.id),
      bpm: Number(row.bpm),
      recordedAt: String(row.recorded_at),
    },
  };
}

/**
 * Per-local-day average BPM across `numDays` ending on `endDay` (oldest first).
 */
export async function getHeartRateDayBucketsForRange(
  endDay: Date,
  numDays: number,
): Promise<HeartRangeResult> {
  const n = Math.floor(numDays);
  if (n < 1 || n > 31) {
    return { error: { message: 'Invalid range' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { error: user.error };
  }

  const endStart = startOfLocalDayVitals(endDay);
  const firstStart = addCalendarDaysVitals(endStart, -(n - 1));
  const { startIso } = localDayBoundsIsoVitals(firstStart);
  const { endIso } = localDayBoundsIsoVitals(endDay);

  const { data, error } = await supabase
    .from('heart_rate_readings')
    .select('id, bpm, recorded_at')
    .eq('user_id', user.userId)
    .gte('recorded_at', startIso)
    .lte('recorded_at', endIso)
    .order('recorded_at', { ascending: false });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  const rows = data ?? [];

  const sumByKey = new Map<string, { sum: number; count: number }>();
  for (let i = 0; i < n; i += 1) {
    const d = addCalendarDaysVitals(firstStart, i);
    sumByKey.set(localDateKeyFromDateVitals(d), { sum: 0, count: 0 });
  }

  for (const row of rows) {
    const key = localDateKeyFromIsoVitals(String(row.recorded_at));
    if (!key || !sumByKey.has(key)) {
      continue;
    }
    const b = sumByKey.get(key)!;
    b.sum += Number(row.bpm);
    b.count += 1;
  }

  const days: HeartRateDayBucket[] = [];
  for (let i = 0; i < n; i += 1) {
    const d = addCalendarDaysVitals(firstStart, i);
    const key = localDateKeyFromDateVitals(d);
    const b = sumByKey.get(key)!;
    days.push({
      date: d,
      avgBpm: b.count > 0 ? Math.round(b.sum / b.count) : null,
    });
  }

  return { days };
}

export async function addHeartRateReading(bpm: number): Promise<AddHeartRateResult> {
  if (!Number.isFinite(bpm) || bpm < 35 || bpm > 220) {
    return { ok: false, error: { message: 'BPM must be between 35 and 220' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const { error } = await supabase.from('heart_rate_readings').insert({
    user_id: user.userId,
    bpm: Math.round(bpm),
    source: 'manual',
  });

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }

  return { ok: true };
}
