import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { DayMacroTotals, MealDaySummary, MealWithItems } from '../../../services/meals';
import { getMealDaySummariesForRange, getMealsForToday } from '../../../services/meals';
import {
  loadMealCalorieProfile,
  type MealCalorieProfile,
} from '../../../services/mealCalorieTarget';
import { loadUserGoals, type UserGoals } from '../../../services/goals';
import { getTodayTotalMl, getWaterDailyTotalsForRange } from '../../../services/water';
import type { WaterDayTotal } from '../../../services/water';
import {
  getLatestHeartRateFromDevice,
  getHeartRateDayBucketsForRange,
  getLatestHeartRateReading,
  syncLatestHeartRateFromDevice,
  upsertExternalHeartRateReading,
  type HeartRateDayBucket,
  type HeartRateReading,
} from '../../../services/vitals';
export type DashboardSnapshot = Readonly<{
  profile: MealCalorieProfile;
  calorieTarget: number;
  todayMeals: MealWithItems[];
  todayCalories: number;
  todayMacros: DayMacroTotals;
  waterTodayMl: number;
  waterGoalMl: number;
  mealWeek: MealDaySummary[];
  waterWeek: WaterDayTotal[];
  heartWeek: HeartRateDayBucket[];
  heartLatest: HeartRateReading | null;
  goals: UserGoals;
  weightGoalKg: number;
}>;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function macrosFromMeals(meals: MealWithItems[]): DayMacroTotals {
  let proteinG = 0;
  let carbsG = 0;
  let fatG = 0;
  let fiberG = 0;
  for (const m of meals) {
    for (const it of m.items) {
      proteinG += it.proteinG ?? 0;
      carbsG += it.carbsG ?? 0;
      fatG += it.fatG ?? 0;
      fiberG += it.fiberG ?? 0;
    }
  }
  return {
    proteinG: round1(proteinG),
    carbsG: round1(carbsG),
    fatG: round1(fatG),
    fiberG: round1(fiberG),
  };
}

export function useDashboardData() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const today = new Date();

    try {
      const profile = await loadMealCalorieProfile();
      const goals = await loadUserGoals();
      const calorieTarget = goals.calorieIntakeGoal;

      const mealsToday = await getMealsForToday();
      if ('error' in mealsToday) {
        setError(mealsToday.error.message);
        setSnapshot(null);
        return;
      }

      const waterToday = await getTodayTotalMl();
      const waterMl = 'error' in waterToday ? 0 : waterToday.totalMl;

      const mealWeekR = await getMealDaySummariesForRange(today, 7);
      if ('error' in mealWeekR) {
        setError(mealWeekR.error.message);
        setSnapshot(null);
        return;
      }

      const waterWeekR = await getWaterDailyTotalsForRange(today, 7);
      if ('error' in waterWeekR) {
        setError(waterWeekR.error.message);
        setSnapshot(null);
        return;
      }

      let heartLatestR = await getLatestHeartRateReading();
      const deviceLatestR = await getLatestHeartRateFromDevice();
      if (!('error' in deviceLatestR) && deviceLatestR.reading) {
        const deviceIso = deviceLatestR.reading.recordedAt.toISOString();
        const dbIso =
          !('error' in heartLatestR) && heartLatestR.reading
            ? heartLatestR.reading.recordedAt
            : null;
        const shouldUseDevice =
          dbIso == null || deviceLatestR.reading.recordedAt.getTime() > new Date(dbIso).getTime();
        if (shouldUseDevice) {
          heartLatestR = {
            reading: {
              id: `device:${deviceIso}`,
              bpm: deviceLatestR.reading.bpm,
              recordedAt: deviceIso,
              source: deviceLatestR.reading.source,
            },
          };
        }
        void upsertExternalHeartRateReading(deviceLatestR.reading);
      } else if (!('error' in heartLatestR) && !heartLatestR.reading) {
        const syncR = await syncLatestHeartRateFromDevice();
        if (syncR.ok && syncR.synced) {
          heartLatestR = await getLatestHeartRateReading();
        }
      }
      const heartWeekR = await getHeartRateDayBucketsForRange(today, 7);

      let heartLatest: HeartRateReading | null = null;
      let heartWeek: HeartRateDayBucket[] = [];
      if (!('error' in heartLatestR)) {
        heartLatest = heartLatestR.reading;
      }
      if (!('error' in heartWeekR)) {
        heartWeek = heartWeekR.days;
      }

      setSnapshot({
        profile,
        calorieTarget,
        todayMeals: mealsToday.meals,
        todayCalories: mealsToday.totalCalories,
        todayMacros: macrosFromMeals(mealsToday.meals),
        waterTodayMl: waterMl,
        waterGoalMl: goals.waterIntakeGoalMl,
        mealWeek: mealWeekR.days,
        waterWeek: waterWeekR.days,
        heartWeek,
        heartLatest,
        goals,
        weightGoalKg: goals.targetWeightKg,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { snapshot, loading, error, refresh };
}
