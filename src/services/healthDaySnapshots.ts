import { Platform } from 'react-native';
import { supabase } from './supabase';

export type HealthSnapshotServiceError = Readonly<{
  message: string;
  code?: string;
}>;

type UpsertInput = Readonly<{
  day: Date;
  steps: number | null;
  activeEnergyKcal: number | null;
  avgHeartRateBpm: number | null;
  workoutCount: number | null;
  sleepSegmentsCount: number | null;
  cycleLogCount: number | null;
  payload: Record<string, unknown>;
}>;

type UpsertResult = Readonly<{ ok: true }> | Readonly<{ ok: false; error: HealthSnapshotServiceError }>;

export type ExerciseDaySnapshot = Readonly<{
  date: Date;
  steps: number;
  activeEnergyKcal: number;
  workoutCount: number;
  workoutMinutes: number;
  workoutDetails: ExerciseWorkoutDetail[];
}>;

export type ExerciseWorkoutDetail = Readonly<{
  source: 'healthkit' | 'health_connect';
  title: string;
  startAt: string | null;
  endAt: string | null;
  durationMin: number;
  energyKcal: number | null;
}>;

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function requireUserId(): Promise<{ userId: string } | { error: HealthSnapshotServiceError }> {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    return { error: { message: error.message, code: error.name } };
  }
  if (!data.user) {
    return { error: { message: 'Not signed in' } };
  }
  return { userId: data.user.id };
}

export async function upsertHealthDaySnapshot(input: UpsertInput): Promise<UpsertResult> {
  const user = await requireUserId();
  if ('error' in user) {
    return { ok: false, error: user.error };
  }

  const platform = Platform.OS === 'ios' ? 'ios' : 'android';
  const day = localDateKey(input.day);

  const { error } = await supabase.from('exercise').upsert(
    {
      user_id: user.userId,
      day,
      platform,
      steps: input.steps ?? null,
      active_energy_kcal: input.activeEnergyKcal ?? null,
      avg_heart_rate_bpm: input.avgHeartRateBpm ?? null,
      workout_count: input.workoutCount ?? null,
      sleep_segments_count: input.sleepSegmentsCount ?? null,
      cycle_log_count: input.cycleLogCount ?? null,
      payload: input.payload,
      synced_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,day,platform' },
  );

  if (error) {
    return { ok: false, error: { message: error.message, code: error.code } };
  }
  return { ok: true };
}

/**
 * Daily exercise snapshots from `startDay` to `endDay` (inclusive), oldest first.
 */
export async function getExerciseDaySnapshotsForPeriod(
  startDay: Date,
  endDay: Date,
): Promise<
  Readonly<{ days: ExerciseDaySnapshot[] }> | Readonly<{ error: HealthSnapshotServiceError }>
> {
  const user = await requireUserId();
  if ('error' in user) {
    return { error: user.error };
  }

  const start = localDateKey(startDay);
  const end = localDateKey(endDay);
  if (start > end) {
    return { error: { message: 'Invalid date range' } };
  }

  const { data, error } = await supabase
    .from('exercise')
    .select('day, steps, active_energy_kcal, workout_count, payload, synced_at')
    .eq('user_id', user.userId)
    .gte('day', start)
    .lte('day', end)
    .order('day', { ascending: true })
    .order('synced_at', { ascending: false });

  if (error) {
    return { error: { message: error.message, code: error.code } };
  }

  const bestByDay = new Map<
    string,
    {
      steps: number;
      activeEnergyKcal: number;
      workoutCount: number;
      workoutMinutes: number;
      workoutDetails: ExerciseWorkoutDetail[];
    }
  >();
  for (const row of data ?? []) {
    const key = String(row.day);
    if (bestByDay.has(key)) {
      continue;
    }
    const workoutSummary = extractWorkoutSummaryFromPayload(row.payload);
    bestByDay.set(key, {
      steps: row.steps == null ? 0 : Number(row.steps),
      activeEnergyKcal:
        row.active_energy_kcal == null ? 0 : Number(row.active_energy_kcal),
      workoutCount: row.workout_count == null ? 0 : Number(row.workout_count),
      workoutMinutes: workoutSummary.totalMinutes,
      workoutDetails: workoutSummary.details,
    });
  }

  const days: ExerciseDaySnapshot[] = [];
  const cursor = new Date(startDay);
  cursor.setHours(0, 0, 0, 0);
  const endDate = new Date(endDay);
  endDate.setHours(0, 0, 0, 0);
  while (cursor.getTime() <= endDate.getTime()) {
    const key = localDateKey(cursor);
    const row = bestByDay.get(key);
    days.push({
      date: new Date(cursor),
      steps: row?.steps ?? 0,
      activeEnergyKcal: row?.activeEnergyKcal ?? 0,
      workoutCount: row?.workoutCount ?? 0,
      workoutMinutes: row?.workoutMinutes ?? 0,
      workoutDetails: row?.workoutDetails ?? [],
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return { days };
}

function safeNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) {
    return v;
  }
  return null;
}

function durationMinFromIosWorkout(workout: Record<string, unknown>): number {
  const d = safeNum(workout.duration);
  if (d != null && d > 0) {
    if (d >= 180) {
      return Math.max(1, Math.round(d / 60));
    }
    return Math.max(1, Math.round(d));
  }
  const start =
    typeof workout.startDate === 'string'
      ? workout.startDate
      : typeof workout.start === 'string'
        ? workout.start
        : null;
  const end =
    typeof workout.endDate === 'string'
      ? workout.endDate
      : typeof workout.end === 'string'
        ? workout.end
        : null;
  if (!start || !end) {
    return 0;
  }
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) {
    return 0;
  }
  return Math.max(1, Math.round((b - a) / 60000));
}

function energyKcalFromIosWorkout(workout: Record<string, unknown>): number | null {
  const raw = safeNum(workout.calories);
  return raw == null ? null : Math.round(raw * 10) / 10;
}

function durationMinFromAndroidWorkout(workout: Record<string, unknown>): number {
  const start = typeof workout.startTime === 'string' ? workout.startTime : null;
  const end = typeof workout.endTime === 'string' ? workout.endTime : null;
  if (start && end) {
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (!Number.isNaN(a) && !Number.isNaN(b) && b > a) {
      return Math.max(1, Math.round((b - a) / 60000));
    }
  }
  const d = safeNum(workout.duration);
  if (d == null || d <= 0) {
    return 0;
  }
  if (d > 3600) {
    return Math.max(1, Math.round(d / 60000));
  }
  return Math.max(1, Math.round(d / 60));
}

function energyKcalFromAndroidWorkout(workout: Record<string, unknown>): number | null {
  const energy = workout.totalEnergyBurned;
  if (!energy || typeof energy !== 'object') {
    return null;
  }
  const raw = safeNum((energy as { inKilocalories?: unknown }).inKilocalories);
  return raw == null ? null : Math.round(raw * 10) / 10;
}

function titleFromIosWorkout(workout: Record<string, unknown>): string {
  if (typeof workout.activityName === 'string' && workout.activityName.length > 0) {
    return workout.activityName;
  }
  if (typeof workout.activityType === 'string' && workout.activityType.length > 0) {
    return workout.activityType;
  }
  return 'Workout';
}

function titleFromAndroidWorkout(workout: Record<string, unknown>): string {
  if (typeof workout.title === 'string' && workout.title.length > 0) {
    return workout.title;
  }
  if (typeof workout.exerciseType === 'number') {
    return `Activity ${workout.exerciseType}`;
  }
  return 'Workout';
}

function extractWorkoutSummaryFromPayload(
  payload: unknown,
): Readonly<{ totalMinutes: number; details: ExerciseWorkoutDetail[] }> {
  if (!payload || typeof payload !== 'object') {
    return { totalMinutes: 0, details: [] };
  }
  const obj = payload as Record<string, unknown>;
  const platform = obj.platform === 'android' ? 'android' : 'ios';
  const source = platform === 'ios' ? obj.ios : obj.android;
  if (!source || typeof source !== 'object') {
    return { totalMinutes: 0, details: [] };
  }
  const srcObj = source as Record<string, unknown>;
  const rawList = platform === 'ios' ? srcObj.workouts : srcObj.exercise;
  const rows = (() => {
    if (Array.isArray(rawList)) {
      return rawList;
    }
    if (
      rawList &&
      typeof rawList === 'object' &&
      'records' in rawList &&
      Array.isArray((rawList as { records?: unknown[] }).records)
    ) {
      return (rawList as { records: unknown[] }).records;
    }
    return [];
  })();
  if (rows.length === 0) {
    return { totalMinutes: 0, details: [] };
  }
  let total = 0;
  const details: ExerciseWorkoutDetail[] = [];
  for (const item of rows) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (platform === 'ios') {
      const durationMin = durationMinFromIosWorkout(row);
      total += durationMin;
      details.push({
        source: 'healthkit',
        title: titleFromIosWorkout(row),
        startAt:
          typeof row.startDate === 'string'
            ? row.startDate
            : typeof row.start === 'string'
              ? row.start
              : null,
        endAt:
          typeof row.endDate === 'string'
            ? row.endDate
            : typeof row.end === 'string'
              ? row.end
              : null,
        durationMin,
        energyKcal: energyKcalFromIosWorkout(row),
      });
    } else {
      const durationMin = durationMinFromAndroidWorkout(row);
      total += durationMin;
      details.push({
        source: 'health_connect',
        title: titleFromAndroidWorkout(row),
        startAt: typeof row.startTime === 'string' ? row.startTime : null,
        endAt: typeof row.endTime === 'string' ? row.endTime : null,
        durationMin,
        energyKcal: energyKcalFromAndroidWorkout(row),
      });
    }
  }
  return { totalMinutes: total, details };
}
