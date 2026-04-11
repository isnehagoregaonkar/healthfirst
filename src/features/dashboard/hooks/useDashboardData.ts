import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import type { DayMacroTotals, MealDaySummary, MealWithItems } from '../../../services/meals';
import { getMealDaySummariesForRange, getMealsForToday } from '../../../services/meals';
import {
  loadMealCalorieProfile,
  suggestedDailyCalories,
  type MealCalorieProfile,
} from '../../../services/mealCalorieTarget';
import { DEFAULT_DAILY_GOAL_ML, getTodayTotalMl, getWaterDailyTotalsForRange } from '../../../services/water';
import type { WaterDayTotal } from '../../../services/water';
import {
  getHeartRateDayBucketsForRange,
  getLatestHeartRateReading,
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
      const calorieTarget = suggestedDailyCalories(profile);

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

      const heartLatestR = await getLatestHeartRateReading();
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
        waterGoalMl: DEFAULT_DAILY_GOAL_ML,
        mealWeek: mealWeekR.days,
        waterWeek: waterWeekR.days,
        heartWeek,
        heartLatest,
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
