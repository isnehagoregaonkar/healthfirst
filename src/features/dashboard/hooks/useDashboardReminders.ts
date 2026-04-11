import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import type { MainTabParamList } from '../../../navigation/types';
import { isWaterBehindSchedule } from '../../water/waterCoaching';
import { DASH_BAD, DASH_EXERCISE, DASH_WATER } from '../dashboardTokens';
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

    if (isWaterBehindSchedule(waterPct, new Date())) {
      out.push({
        key: 'water',
        icon: 'cup-water',
        title: 'Water is behind schedule',
        subtitle: 'Catch up with a glass — tap to log water.',
        color: DASH_WATER,
        onPress: () => navigation.navigate('Water'),
      });
    }

    if (snapshot.todayCalories > snapshot.calorieTarget) {
      const over = snapshot.todayCalories - snapshot.calorieTarget;
      out.push({
        key: 'cal',
        icon: 'fire-alert',
        title: 'Over calorie target',
        subtitle: `${over} kcal above today’s plan. Consider lighter choices tomorrow.`,
        color: DASH_BAD,
        onPress: () => navigation.navigate('Meals'),
      });
    }

    const hour = new Date().getHours();
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
