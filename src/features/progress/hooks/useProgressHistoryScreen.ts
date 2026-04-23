import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadFastingState } from '../../fasting/fastingStorage';
import type { FastingSession } from '../../fasting/fastingTypes';
import { loadUserGoals, type UserGoals } from '../../../services/goals';
import {
  getExerciseDaySnapshotsForPeriod,
  type ExerciseDaySnapshot,
} from '../../../services/healthDaySnapshots';
import {
  getMealDaySummariesForPeriod,
  type MealDaySummary,
} from '../../../services/meals';
import {
  getWaterDailyTotalsForPeriod,
  type WaterDayTotal,
} from '../../../services/water';

export type ProgressRangePreset = 'week' | 'month' | 'all';

export type ProgressSummary = Readonly<{
  daysCount: number;
  caloriesTotal: number;
  waterTotalMl: number;
  exerciseKcalTotal: number;
  exerciseMinutesTotal: number;
  workoutsTotal: number;
  fastingSessions: number;
  fastingMinutesTotal: number;
  mealGoalHitDays: number;
  waterGoalHitDays: number;
  exerciseGoalHitDays: number;
}>;

export type ProgressDayRow = Readonly<{
  date: Date;
  calories: number;
  waterMl: number;
  exerciseKcal: number;
  exerciseMinutes: number;
  workouts: number;
}>;

function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function keyForDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function overlapsDayRange(
  startIso: string,
  endIso: string,
  rangeStart: Date,
  rangeEnd: Date,
): boolean {
  const start = timestampFromUnknown(startIso);
  const end = timestampFromUnknown(endIso);
  if (start === null || end === null) {
    return false;
  }
  return end >= rangeStart.getTime() && start <= rangeEnd.getTime();
}

function timestampFromUnknown(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    const abs = Math.abs(value);
    return abs >= 1e12 ? value : value * 1000;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const asNumber = Number(trimmed);
    if (Number.isFinite(asNumber)) {
      const abs = Math.abs(asNumber);
      return abs >= 1e12 ? asNumber : asNumber * 1000;
    }
    const parsed = Date.parse(trimmed);
    return Number.isNaN(parsed) ? null : parsed;
  }
  if (!value || typeof value !== 'object') {
    return null;
  }
  const o = value as Record<string, unknown>;
  const nestedKeys = [
    'timestamp',
    'time',
    'date',
    'value',
    'epochMillis',
    'epochMs',
    'epochSeconds',
    'seconds',
  ] as const;
  for (const key of nestedKeys) {
    const nested = o[key];
    if (nested !== undefined) {
      return timestampFromUnknown(nested);
    }
  }
  return null;
}

function fastingDurationMin(session: FastingSession): number {
  if (Number.isFinite(session.durationMin) && session.durationMin > 0) {
    return Math.max(1, Math.round(session.durationMin));
  }
  const start = timestampFromUnknown(session.startedAt);
  const end = timestampFromUnknown(session.endedAt);
  if (start == null || end == null || end <= start) {
    return 0;
  }
  return Math.max(1, Math.round((end - start) / 60_000));
}

function calcRange(preset: ProgressRangePreset, anchor: Date): { start: Date; end: Date } {
  const end = startOfLocalDay(anchor);
  if (preset === 'week') {
    return { start: addDays(end, -6), end };
  }
  if (preset === 'month') {
    return { start: addDays(end, -29), end };
  }
  return { start: new Date(2000, 0, 1), end };
}

export function useProgressHistoryScreen() {
  const [preset, setPreset] = useState<ProgressRangePreset>('week');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [mealDays, setMealDays] = useState<MealDaySummary[]>([]);
  const [waterDays, setWaterDays] = useState<WaterDayTotal[]>([]);
  const [exerciseDays, setExerciseDays] = useState<ExerciseDaySnapshot[]>([]);
  const [fastingSessions, setFastingSessions] = useState<FastingSession[]>([]);

  const range = useMemo(() => calcRange(preset, startOfLocalDay(new Date())), [preset]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [goalsR, mealsR, waterR, exerciseR, fastingR] = await Promise.all([
        loadUserGoals(),
        getMealDaySummariesForPeriod(range.start, range.end),
        getWaterDailyTotalsForPeriod(range.start, range.end),
        getExerciseDaySnapshotsForPeriod(range.start, range.end),
        loadFastingState(),
      ]);

      setGoals(goalsR);
      if ('error' in mealsR) {
        throw new Error(mealsR.error.message);
      }
      if ('error' in waterR) {
        throw new Error(waterR.error.message);
      }
      if ('error' in exerciseR) {
        throw new Error(exerciseR.error.message);
      }

      setMealDays(mealsR.days);
      setWaterDays(waterR.days);
      setExerciseDays(exerciseR.days);

      const rangeStart = new Date(range.start);
      rangeStart.setHours(0, 0, 0, 0);
      const rangeEnd = new Date(range.end);
      rangeEnd.setHours(23, 59, 59, 999);
      const inRangeFasting = fastingR.history.filter(s =>
        overlapsDayRange(s.startedAt, s.endedAt, rangeStart, rangeEnd),
      );
      setFastingSessions(inRangeFasting);

    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load progress data');
      setMealDays([]);
      setWaterDays([]);
      setExerciseDays([]);
      setFastingSessions([]);
    } finally {
      setLoading(false);
    }
  }, [range.end, range.start]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const dayRows = useMemo((): ProgressDayRow[] => {
    const map = new Map<string, ProgressDayRow>();
    const cursor = new Date(range.start);
    while (cursor.getTime() <= range.end.getTime()) {
      const key = keyForDate(cursor);
      map.set(key, {
        date: new Date(cursor),
        calories: 0,
        waterMl: 0,
        exerciseKcal: 0,
        exerciseMinutes: 0,
        workouts: 0,
      });
      cursor.setDate(cursor.getDate() + 1);
    }

    for (const d of mealDays) {
      const key = keyForDate(d.date);
      const row = map.get(key);
      if (!row) {
        continue;
      }
      map.set(key, { ...row, calories: d.totalCalories });
    }
    for (const d of waterDays) {
      const key = keyForDate(d.date);
      const row = map.get(key);
      if (!row) {
        continue;
      }
      map.set(key, { ...row, waterMl: d.totalMl });
    }
    for (const d of exerciseDays) {
      const key = keyForDate(d.date);
      const row = map.get(key);
      if (!row) {
        continue;
      }
      map.set(key, {
        ...row,
        exerciseKcal: Math.round(d.activeEnergyKcal),
        exerciseMinutes: d.workoutMinutes,
        workouts: d.workoutCount,
      });
    }
    return Array.from(map.values());
  }, [exerciseDays, mealDays, range.end, range.start, waterDays]);

  const summary = useMemo<ProgressSummary>(() => {
    const daysCount = dayRows.length;
    const caloriesTotal = dayRows.reduce((acc, d) => acc + d.calories, 0);
    const waterTotalMl = dayRows.reduce((acc, d) => acc + d.waterMl, 0);
    const exerciseKcalTotal = dayRows.reduce((acc, d) => acc + d.exerciseKcal, 0);
    const exerciseMinutesTotal = dayRows.reduce((acc, d) => acc + d.exerciseMinutes, 0);
    const workoutsTotal = dayRows.reduce((acc, d) => acc + d.workouts, 0);
    const fastingMinutesTotal = fastingSessions.reduce(
      (acc, session) => acc + fastingDurationMin(session),
      0,
    );
    let mealGoalHitDays = 0;
    let waterGoalHitDays = 0;
    let exerciseGoalHitDays = 0;
    if (goals) {
      mealGoalHitDays = dayRows.filter(d => d.calories > 0 && d.calories <= goals.calorieIntakeGoal).length;
      waterGoalHitDays = dayRows.filter(d => d.waterMl >= goals.waterIntakeGoalMl).length;
      exerciseGoalHitDays = dayRows.filter(d => d.exerciseMinutes >= goals.exerciseMinutesGoal).length;
    }
    return {
      daysCount,
      caloriesTotal,
      waterTotalMl,
      exerciseKcalTotal,
      exerciseMinutesTotal,
      workoutsTotal,
      fastingSessions: fastingSessions.length,
      fastingMinutesTotal,
      mealGoalHitDays,
      waterGoalHitDays,
      exerciseGoalHitDays,
    };
  }, [dayRows, fastingSessions, goals]);

  return {
    preset,
    setPreset,
    range,
    loading,
    error,
    refresh,
    goals,
    dayRows,
    summary,
  };
}
