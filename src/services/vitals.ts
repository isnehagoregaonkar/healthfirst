import { supabase } from './supabase';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

export type VitalsServiceError = Readonly<{
  message: string;
  code?: string;
}>;

export type HeartRateReading = Readonly<{
  id: string;
  bpm: number;
  recordedAt: string;
  source: 'manual' | 'health_connect' | 'healthkit' | 'unknown';
}>;

type AddHeartRateResult =
  | Readonly<{ ok: true }>
  | Readonly<{ ok: false; error: VitalsServiceError }>;

type ExternalHeartRateSource = 'health_connect' | 'healthkit';
type DeviceSyncResult = Readonly<{ ok: true; synced: boolean }> | Readonly<{ ok: false; error: VitalsServiceError }>;
type DeviceLatestHeartRateResult =
  | Readonly<{ reading: { bpm: number; recordedAt: Date; source: ExternalHeartRateSource } | null }>
  | Readonly<{ error: VitalsServiceError }>;

const AppleHealthKit = NativeModules.AppleHealthKit as
  | undefined
  | {
      initHealthKit?: (opts: unknown, cb: (err: unknown, result: unknown) => void) => void;
      getHeartRateSamples?: (opts: unknown, cb: (err: unknown, result: unknown) => void) => void;
    };

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

function isTableMissingError(code?: string): boolean {
  return code === '42P01';
}

function parseFiniteNumber(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    return null;
  }
  return v;
}

function parseMillis(v: unknown): number | null {
  if (typeof v !== 'string' || v.length === 0) {
    return null;
  }
  const ms = new Date(v).getTime();
  return Number.isNaN(ms) ? null : ms;
}

function newestHeartSampleFromIos(raw: unknown): { bpm: number; recordedAt: Date } | null {
  if (!Array.isArray(raw)) {
    return null;
  }
  let newest: { bpm: number; recordedAt: Date } | null = null;
  for (const row of raw) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const o = row as Record<string, unknown>;
    const bpm = parseFiniteNumber(o.value);
    if (bpm == null || bpm < 35 || bpm > 220) {
      continue;
    }
    const ts = parseMillis(o.endDate) ?? parseMillis(o.startDate);
    if (ts == null) {
      continue;
    }
    if (!newest || ts > newest.recordedAt.getTime()) {
      newest = { bpm: Math.round(bpm), recordedAt: new Date(ts) };
    }
  }
  return newest;
}

function newestHeartSampleFromAndroid(raw: unknown): { bpm: number; recordedAt: Date } | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const records = (raw as { records?: unknown }).records;
  if (!Array.isArray(records)) {
    return null;
  }

  let newest: { bpm: number; recordedAt: Date } | null = null;
  for (const rec of records) {
    if (!rec || typeof rec !== 'object') {
      continue;
    }
    const row = rec as { samples?: unknown; startTime?: unknown; endTime?: unknown };
    const fallbackTs =
      parseMillis(row.endTime) ?? parseMillis(row.startTime) ?? Date.now();
    const samples = Array.isArray(row.samples) ? row.samples : [];
    for (const s of samples) {
      if (!s || typeof s !== 'object') {
        continue;
      }
      const sample = s as { beatsPerMinute?: unknown; time?: unknown };
      const bpm = parseFiniteNumber(sample.beatsPerMinute);
      if (bpm == null || bpm < 35 || bpm > 220) {
        continue;
      }
      const ts = parseMillis(sample.time) ?? fallbackTs;
      if (!newest || ts > newest.recordedAt.getTime()) {
        newest = { bpm: Math.round(bpm), recordedAt: new Date(ts) };
      }
    }
  }
  return newest;
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

  const latestFromHistory = await supabase
    .from('heart_rate_history')
    .select('id, bpm, recorded_at')
    .eq('user_id', user.userId)
    .order('recorded_at', { ascending: false })
    .limit(1);
  if (latestFromHistory.error && !isTableMissingError(latestFromHistory.error.code)) {
    return {
      error: { message: latestFromHistory.error.message, code: latestFromHistory.error.code },
    };
  }

  const latestResult = latestFromHistory.error
    ? await supabase
        .from('heart_rate_readings')
        .select('id, bpm, recorded_at, source')
        .eq('user_id', user.userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
    : await supabase
        .from('heart_rate_history')
        .select('id, bpm, recorded_at, source')
        .eq('user_id', user.userId)
        .order('recorded_at', { ascending: false })
        .limit(1);

  if (latestResult.error) {
    return { error: { message: latestResult.error.message, code: latestResult.error.code } };
  }

  const row = latestResult.data?.[0];
  if (!row) {
    return { reading: null };
  }

  return {
    reading: {
      id: String(row.id),
      bpm: Number(row.bpm),
      recordedAt: String(row.recorded_at),
      source:
        String(row.source) === 'manual' ||
        String(row.source) === 'health_connect' ||
        String(row.source) === 'healthkit'
          ? (String(row.source) as HeartRateReading['source'])
          : 'unknown',
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

  const rangeFromHistory = await supabase
    .from('heart_rate_history')
    .select('id, bpm, recorded_at')
    .eq('user_id', user.userId)
    .gte('recorded_at', startIso)
    .lte('recorded_at', endIso)
    .order('recorded_at', { ascending: false });
  if (rangeFromHistory.error && !isTableMissingError(rangeFromHistory.error.code)) {
    return { error: { message: rangeFromHistory.error.message, code: rangeFromHistory.error.code } };
  }

  const rangeResult = rangeFromHistory.error
    ? await supabase
        .from('heart_rate_readings')
        .select('id, bpm, recorded_at')
        .eq('user_id', user.userId)
        .gte('recorded_at', startIso)
        .lte('recorded_at', endIso)
        .order('recorded_at', { ascending: false })
    : rangeFromHistory;

  if (rangeResult.error) {
    return { error: { message: rangeResult.error.message, code: rangeResult.error.code } };
  }

  const rows = rangeResult.data ?? [];

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

  const insertResult = await supabase.from('heart_rate_history').insert({
    user_id: user.userId,
    bpm: Math.round(bpm),
    recorded_at: new Date().toISOString(),
    source: 'manual',
  });
  if (insertResult.error && !isTableMissingError(insertResult.error.code)) {
    return {
      ok: false,
      error: { message: insertResult.error.message, code: insertResult.error.code },
    };
  }

  if (insertResult.error) {
    const fallback = await supabase.from('heart_rate_readings').insert({
      user_id: user.userId,
      bpm: Math.round(bpm),
      source: 'manual',
    });
    if (fallback.error) {
      return { ok: false, error: { message: fallback.error.message, code: fallback.error.code } };
    }
  }

  return { ok: true };
}

export async function upsertExternalHeartRateReading(input: {
  bpm: number;
  recordedAt: Date;
  source: ExternalHeartRateSource;
}): Promise<AddHeartRateResult> {
  if (!Number.isFinite(input.bpm) || input.bpm < 35 || input.bpm > 220) {
    return { ok: false, error: { message: 'BPM must be between 35 and 220' } };
  }

  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const recordedIso = input.recordedAt.toISOString();
  const upsertResult = await supabase.from('heart_rate_history').upsert(
    {
      user_id: user.userId,
      bpm: Math.round(input.bpm),
      recorded_at: recordedIso,
      source: input.source,
    },
    { onConflict: 'user_id,source,recorded_at' },
  );

  if (upsertResult.error && !isTableMissingError(upsertResult.error.code)) {
    return {
      ok: false,
      error: { message: upsertResult.error.message, code: upsertResult.error.code },
    };
  }

  if (upsertResult.error) {
    const fallback = await supabase.from('heart_rate_readings').insert({
      user_id: user.userId,
      bpm: Math.round(input.bpm),
      recorded_at: recordedIso,
      source: input.source,
    });
    if (fallback.error) {
      return { ok: false, error: { message: fallback.error.message, code: fallback.error.code } };
    }
  }

  return { ok: true };
}

export async function syncLatestHeartRateFromDevice(): Promise<DeviceSyncResult> {
  const latest = await getLatestHeartRateFromDevice();
  if ('error' in latest) {
    return { ok: false, error: latest.error };
  }
  if (!latest.reading) {
    return { ok: true, synced: false };
  }
  const save = await upsertExternalHeartRateReading({
    bpm: latest.reading.bpm,
    recordedAt: latest.reading.recordedAt,
    source: latest.reading.source,
  });
  if (!save.ok) {
    return { ok: false, error: save.error };
  }
  return { ok: true, synced: true };
}

export async function getLatestHeartRateFromDevice(): Promise<DeviceLatestHeartRateResult> {
  try {
    if (Platform.OS === 'ios') {
      if (!AppleHealthKit?.initHealthKit || !AppleHealthKit?.getHeartRateSamples) {
        return { reading: null };
      }
      await new Promise<void>(resolve => {
        AppleHealthKit.initHealthKit?.(
          { permissions: { read: ['HeartRate'], write: [] } },
          () => resolve(),
        );
      });

      const now = new Date();
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const raw = await new Promise<unknown>(resolve => {
        AppleHealthKit.getHeartRateSamples?.(
          { startDate: start.toISOString(), endDate: now.toISOString() },
          (err, result) => resolve(err ? [] : result),
        );
      });
      const latest = newestHeartSampleFromIos(raw);
      if (!latest) {
        return { reading: null };
      }
      return { reading: { ...latest, source: 'healthkit' } };
    }

    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.ACTIVITY_RECOGNITION,
    ]);
    const hc = await import('react-native-health-connect');
    await hc.initialize();
    await hc.requestPermission([{ accessType: 'read', recordType: 'HeartRate' }]);

    const now = new Date();
    const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const raw = await hc.readRecords('HeartRate' as never, {
      timeRangeFilter: {
        operator: 'between',
        startTime: start.toISOString(),
        endTime: now.toISOString(),
      },
    });
    const latest = newestHeartSampleFromAndroid(raw);
    if (!latest) {
      return { reading: null };
    }
    return { reading: { ...latest, source: 'health_connect' } };
  } catch (e) {
    return {
      error: { message: e instanceof Error ? e.message : 'Unable to sync heart rate from device' },
    };
  }
}
