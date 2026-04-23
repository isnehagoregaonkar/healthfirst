import type { StreakCapsuleTone } from '../components/StreakPanel';
import type { MealDaySummary } from '../../../services/meals';
import type { WaterDayTotal } from '../../../services/water';

export function dayHasLog(day: {
  mealCount: number;
  totalCalories: number;
  waterTotalMl?: number;
}): boolean {
  return day.mealCount > 0 || day.totalCalories > 0 || (day.waterTotalMl ?? 0) > 0;
}

export function streakToneForDay(
  day: { mealCount: number; totalCalories: number; waterTotalMl?: number },
  calorieTarget: number,
  isFuture: boolean,
): StreakCapsuleTone {
  if (isFuture) {
    return 'future';
  }
  if (!dayHasLog(day)) {
    return 'missed';
  }
  const k = day.totalCalories;
  const target = Math.max(calorieTarget, 1);
  if (k > target) {
    return 'over';
  }
  if (k <= 0) {
    return 'warn';
  }
  return 'good';
}

/** Consecutive days (from today backward) with any meal logged that day. */
export function computeMealLogStreak(
  mealWeek: ReadonlyArray<{
    mealCount: number;
    totalCalories: number;
    waterTotalMl?: number;
  }>,
): number {
  let n = 0;
  for (let i = mealWeek.length - 1; i >= 0; i -= 1) {
    if (dayHasLog(mealWeek[i])) {
      n += 1;
    } else {
      break;
    }
  }
  return n;
}

export function longestMealLogRunInWeek(
  mealWeek: ReadonlyArray<{
    mealCount: number;
    totalCalories: number;
    waterTotalMl?: number;
  }>,
): number {
  let best = 0;
  let cur = 0;
  for (const d of mealWeek) {
    if (dayHasLog(d)) {
      cur += 1;
      best = Math.max(best, cur);
    } else {
      cur = 0;
    }
  }
  return best;
}

export function formatWeekdayShort(d: Date): string {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

export function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export type DashboardStreakModel = Readonly<{
  capsules: ReadonlyArray<{
    id: string;
    label: string;
    isToday: boolean;
    tone: StreakCapsuleTone;
  }>;
  streak: number;
  longest: number;
  todayOver: boolean;
}>;

export function buildDashboardStreakModel(
  mealWeek: ReadonlyArray<MealDaySummary>,
  waterWeek: ReadonlyArray<WaterDayTotal>,
  calorieTarget: number,
): DashboardStreakModel {
  const waterByDay = new Map<string, number>();
  for (const day of waterWeek) {
    waterByDay.set(localDayKey(day.date), day.totalMl);
  }
  const combinedWeek = mealWeek.map(day => ({
    ...day,
    waterTotalMl: waterByDay.get(localDayKey(day.date)) ?? 0,
  }));

  const n = mealWeek.length;
  const todayIdx = n - 1;
  const todayDay = combinedWeek[todayIdx];
  const todayOver =
    dayHasLog(todayDay) &&
    todayDay.totalCalories > Math.max(calorieTarget, 1);

  const capsules = combinedWeek.map((day, i) => ({
    id: localDayKey(day.date),
    label: formatWeekdayShort(day.date),
    isToday: i === todayIdx,
    tone: streakToneForDay(day, calorieTarget, i > todayIdx),
  }));

  return {
    capsules,
    streak: computeMealLogStreak(combinedWeek),
    longest: longestMealLogRunInWeek(combinedWeek),
    todayOver,
  };
}
