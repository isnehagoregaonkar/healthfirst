import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import type { MainTabParamList } from '../../../navigation/types';
import type { MealWithItems } from '../../../services/meals';
import { isWaterBehindSchedule } from '../../water/waterCoaching';
import { DASH_BAD, DASH_EXERCISE, DASH_WATER, RING_CAL } from '../dashboardTokens';
import type { DashboardSnapshot } from './useDashboardData';
import { EXERCISE_STREAK_MIN } from './useDashboardTodayMetrics';

export type DashboardReminder = Readonly<{
  key: string;
  icon: string;
  title: string;
  subtitle?: string;
  color: string;
  onPress?: () => void;
}>;

type TabNav = BottomTabNavigationProp<MainTabParamList>;

type MainMealType = 'breakfast' | 'lunch' | 'dinner';

/** After this local time, remind if this meal still has no logged items (standard meal windows). */
const MAIN_MEAL_REMIND_AFTER: ReadonlyArray<
  Readonly<{ mealType: MainMealType; label: string; hour: number; minute: number }>
> = [
  { mealType: 'breakfast', label: 'Breakfast', hour: 10, minute: 30 },
  { mealType: 'lunch', label: 'Lunch', hour: 14, minute: 30 },
  { mealType: 'dinner', label: 'Dinner', hour: 21, minute: 0 },
];

function localMinutesOfDay(now: Date): number {
  return now.getHours() * 60 + now.getMinutes();
}

function isPastMealRemindTime(
  now: Date,
  hour: number,
  minute: number,
): boolean {
  return localMinutesOfDay(now) >= hour * 60 + minute;
}

function hasMainMealLogged(meals: MealWithItems[], mealType: MainMealType): boolean {
  return meals.some(m => m.mealType === mealType && m.items.length > 0);
}

function formatMissingMealLabels(labels: string[]): string {
  if (labels.length === 0) {
    return '';
  }
  if (labels.length === 1) {
    return labels[0];
  }
  if (labels.length === 2) {
    return `${labels[0]} and ${labels[1]}`;
  }
  const last = labels.at(-1);
  return `${labels.slice(0, -1).join(', ')}, and ${last}`;
}

/**
 * Main meals (not snacks) missing after typical end-of-window times.
 * Only applies when the user is still under their calorie goal (avoids nagging once the day is “full”).
 */
function getMissingMainMealReminderSubtitle(
  meals: MealWithItems[],
  now: Date,
  todayCalories: number,
  calorieTarget: number,
): string | null {
  if (calorieTarget > 0 && todayCalories >= calorieTarget) {
    return null;
  }
  const missingLabels: string[] = [];
  for (const row of MAIN_MEAL_REMIND_AFTER) {
    if (!isPastMealRemindTime(now, row.hour, row.minute)) {
      continue;
    }
    if (!hasMainMealLogged(meals, row.mealType)) {
      missingLabels.push(row.label);
    }
  }
  if (missingLabels.length === 0) {
    return null;
  }
  const listed = formatMissingMealLabels(missingLabels);
  const them = missingLabels.length === 1 ? 'it' : 'them';
  return `You haven't logged ${listed} yet — tap to add ${them}.`;
}

export function useDashboardReminders(
  snapshot: DashboardSnapshot | null,
  navigation: TabNav,
  waterPct: number,
  exerciseToday: number,
): DashboardReminder[] {
  return useMemo(() => {
    if (!snapshot) {
      return [];
    }
    const out: DashboardReminder[] = [];

    const now = new Date();

    if (isWaterBehindSchedule(waterPct, now)) {
      out.push({
        key: 'water',
        icon: 'cup-water',
        title: 'Water is behind schedule',
        subtitle: 'Catch up with a glass — tap to log water.',
        color: DASH_WATER,
        onPress: () => navigation.navigate('Water'),
      });
    }

    const mealLogSubtitle = getMissingMainMealReminderSubtitle(
      snapshot.todayMeals,
      now,
      snapshot.todayCalories,
      snapshot.calorieTarget,
    );
    if (mealLogSubtitle) {
      out.push({
        key: 'cal_meals',
        icon: 'food-apple',
        title: 'Log your meals',
        subtitle: mealLogSubtitle,
        color: RING_CAL,
        onPress: () => navigation.navigate('Meals'),
      });
    }

    if (snapshot.todayCalories > snapshot.calorieTarget) {
      const over = snapshot.todayCalories - snapshot.calorieTarget;
      out.push({
        key: 'cal',
        icon: 'fire-alert',
        title: 'Over calorie target',
        subtitle: `${over} kcal above today's plan. Consider lighter choices tomorrow.`,
        color: DASH_BAD,
        onPress: () => navigation.navigate('Meals'),
      });
    }

    const hour = now.getHours();
    if (hour >= 17 && exerciseToday < EXERCISE_STREAK_MIN) {
      out.push({
        key: 'move',
        icon: 'run-fast',
        title: 'Evening movement',
        subtitle:
          'Exercise tracking is coming soon — a short walk still counts for today.',
        color: DASH_EXERCISE,
      });
    }

    return out;
  }, [snapshot, waterPct, navigation, exerciseToday]);
}
