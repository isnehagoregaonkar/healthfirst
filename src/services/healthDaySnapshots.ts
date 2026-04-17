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
