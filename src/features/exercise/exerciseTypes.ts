export type ExerciseSource = 'apple_health' | 'health_connect' | 'manual';

export type ExerciseSessionRow = Readonly<{
  id: string;
  source: ExerciseSource;
  title: string;
  startedAt: string;
  endedAt: string;
  durationMin: number;
  calories?: number;
  distanceKm?: number;
  /** e.g. Apple Watch / iPhone when synced from HealthKit */
  deviceLabel?: string;
}>;

export type ManualExerciseDraft = Readonly<{
  activityLabel: string;
  durationMin: number;
  startedAt: string;
  notes?: string;
}>;
