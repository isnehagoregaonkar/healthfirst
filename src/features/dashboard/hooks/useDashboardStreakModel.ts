import { useMemo } from 'react';
import { buildDashboardStreakModel } from '../logic/dashboardStreak';
import type { DashboardSnapshot } from './useDashboardData';

export function useDashboardStreakModel(snapshot: DashboardSnapshot | null) {
  return useMemo(() => {
    if (!snapshot) {
      return null;
    }
    return buildDashboardStreakModel(
      snapshot.mealWeek,
      snapshot.waterWeek,
      snapshot.calorieTarget,
    );
  }, [snapshot]);
}
