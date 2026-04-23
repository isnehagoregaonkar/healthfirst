import { useMemo } from 'react';
import {
  computeBmi,
  suggestedMacroTargets,
} from '../../../services/mealCalorieTarget';
import {
  formatWeekdayShort,
  localDayKey,
} from '../logic/dashboardStreak';
import type { DashboardSnapshot } from './useDashboardData';

/** Preview minutes per day until move sync (index aligned with `mealWeek`). */
const EXERCISE_DUMMY = [18, 32, 45, 28, 52, 36, 22] as const;
const KCAL_PER_MOVE_MIN_EST = 7.5;
export const EXERCISE_STREAK_MIN = 25;

export type MoveExerciseWeek = Readonly<{
  values: number[];
  labels: string[];
  dayKeys: string[];
  todayIdx: number;
  weekTotalMin: number;
  estKcalWeek: number;
}>;

export function useDashboardTodayMetrics(snapshot: DashboardSnapshot | null) {
  const calPctRaw = snapshot
    ? Math.round(
        (snapshot.todayCalories / Math.max(snapshot.calorieTarget, 1)) * 100,
      )
    : 0;
  const calOverEarly = snapshot
    ? snapshot.todayCalories > snapshot.calorieTarget
    : false;
  const calPct = calOverEarly ? 100 : Math.min(100, calPctRaw);
  const waterPct = snapshot
    ? Math.min(
        100,
        Math.round(
          (snapshot.waterTodayMl / Math.max(snapshot.waterGoalMl, 1)) * 100,
        ),
      )
    : 0;

  const moveExercise = useMemo((): MoveExerciseWeek => {
    if (!snapshot) {
      return {
        values: [],
        labels: [],
        dayKeys: [],
        todayIdx: 0,
        weekTotalMin: 0,
        estKcalWeek: 0,
      };
    }
    const mw = snapshot.mealWeek;
    const values = mw.map((_, i) => EXERCISE_DUMMY[i] ?? 0);
    const labels = mw.map(d => formatWeekdayShort(d.date).charAt(0));
    const dayKeys = mw.map(d => localDayKey(d.date));
    const todayIdx = Math.max(0, mw.length - 1);
    const weekTotalMin = values.reduce((a, b) => a + b, 0);
    return {
      values,
      labels,
      dayKeys,
      todayIdx,
      weekTotalMin,
      estKcalWeek: Math.round(weekTotalMin * KCAL_PER_MOVE_MIN_EST),
    };
  }, [snapshot]);

  const exerciseToday = snapshot
    ? moveExercise.values[moveExercise.todayIdx] ?? 0
    : 0;
  const exerciseGoalMin = snapshot?.goals.exerciseMinutesGoal ?? 30;
  const moveEstKcalToday = Math.round(exerciseToday * KCAL_PER_MOVE_MIN_EST);

  const weightLabel = useMemo(() => {
    if (!snapshot) {
      return '';
    }
    const delta = snapshot.profile.weightKg - snapshot.weightGoalKg;
    if (Math.abs(delta) < 0.15) {
      return 'On target';
    }
    if (delta > 0) {
      return `${delta.toFixed(1)} kg to goal`;
    }
    return `${Math.abs(delta).toFixed(1)} kg above goal`;
  }, [snapshot]);

  const hrPoints = snapshot?.heartWeek.map(d => d.avgBpm) ?? [];
  const macroTargets = snapshot ? suggestedMacroTargets(snapshot.profile) : null;
  const bmiInfo = snapshot ? computeBmi(snapshot.profile) : null;

  const calOverAmt = snapshot
    ? snapshot.todayCalories - snapshot.calorieTarget
    : 0;

  return {
    calPctRaw,
    calOverEarly,
    calPct,
    waterPct,
    moveExercise,
    exerciseToday,
    exerciseGoalMin,
    moveEstKcalToday,
    weightLabel,
    hrPoints,
    calOverAmt,
    macroTargets,
    bmiInfo,
  };
}
