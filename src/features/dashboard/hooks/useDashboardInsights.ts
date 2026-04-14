import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useMemo } from 'react';
import type { MainTabParamList } from '../../../navigation/types';
import { isWaterBehindSchedule } from '../../water/waterCoaching';
import {
  DASH_BAD,
  DASH_EXERCISE,
  DASH_HEART,
  DASH_MUTED,
  DASH_WATER,
  RING_CAL,
} from '../dashboardTokens';
import type { MoveExerciseWeek } from './useDashboardTodayMetrics';
import type { DashboardSnapshot } from './useDashboardData';

type TabNav = BottomTabNavigationProp<MainTabParamList>;

export type DashboardInsight = Readonly<{
  key: string;
  icon: string;
  text: string;
  color: string;
  onPress?: () => void;
}>;

function avg(vals: number[]): number {
  if (vals.length === 0) {
    return 0;
  }
  return vals.reduce((s, v) => s + v, 0) / vals.length;
}

function countWhere<T>(arr: ReadonlyArray<T>, fn: (v: T) => boolean): number {
  return arr.reduce((c, v) => (fn(v) ? c + 1 : c), 0);
}

type InsightStats = Readonly<{
  calorieTarget: number;
  overTargetDays: number;
  underWaterGoalDays: number;
  belowHalfGoalWaterDays: number;
  lowMoveDays: number;
  activeMoveDays: number;
  weekProteinAvg: number;
}>;

function buildInsightStats(
  snapshot: DashboardSnapshot,
  moveExercise: MoveExerciseWeek,
): InsightStats {
  const calorieTarget = Math.max(snapshot.calorieTarget, 1);
  return {
    calorieTarget,
    overTargetDays: countWhere(snapshot.mealWeek, d => d.totalCalories > calorieTarget),
    underWaterGoalDays: countWhere(snapshot.waterWeek, d => d.totalMl < snapshot.waterGoalMl),
    belowHalfGoalWaterDays: countWhere(
      snapshot.waterWeek,
      d => d.totalMl < snapshot.waterGoalMl * 0.5,
    ),
    lowMoveDays: countWhere(moveExercise.values, v => v < 20),
    activeMoveDays: countWhere(moveExercise.values, v => v >= 30),
    weekProteinAvg: avg(snapshot.mealWeek.map(d => d.macroTotals.proteinG)),
  };
}

export function useDashboardInsights(
  snapshot: DashboardSnapshot | null,
  navigation: TabNav,
  waterPct: number,
  moveExercise: MoveExerciseWeek,
): DashboardInsight[] {
  return useMemo(() => {
    if (!snapshot) {
      return [];
    }

    const stats = buildInsightStats(snapshot, moveExercise);
    const insights: DashboardInsight[] = [];
    const now = new Date();

    if (isWaterBehindSchedule(waterPct, now)) {
      insights.push({
        key: 'water-afternoon',
        icon: 'cup-water',
        text: "You're consistently under-drinking water in afternoons. Add one glass before each meal.",
        color: DASH_WATER,
        onPress: () => navigation.navigate('Water'),
      });
    }

    if (stats.overTargetDays >= 3) {
      insights.push({
        key: 'calories-streak',
        icon: 'fire-alert',
        text: `You exceeded calories ${stats.overTargetDays} days in a row. Try lighter dinner portions this week.`,
        color: DASH_BAD,
        onPress: () => navigation.navigate('Meals'),
      });
    } else if (
      stats.overTargetDays === 0 &&
      snapshot.todayCalories <= stats.calorieTarget
    ) {
      insights.push({
        key: 'calorie-control',
        icon: 'fire',
        text: "Strong calorie consistency this week. You're staying within your daily plan.",
        color: RING_CAL,
        onPress: () => navigation.navigate('Meals'),
      });
    }

    if (stats.underWaterGoalDays >= 4) {
      insights.push({
        key: 'water-week',
        icon: 'water-alert',
        text: `Hydration dipped below goal on ${stats.underWaterGoalDays} of last 7 days. Keep a bottle visible during work blocks.`,
        color: DASH_WATER,
        onPress: () => navigation.navigate('Water'),
      });
    } else if (snapshot.waterTodayMl >= snapshot.waterGoalMl) {
      insights.push({
        key: 'water-goal-hit',
        icon: 'water-check',
        text: 'Water goal complete today. Great job protecting recovery and energy.',
        color: DASH_WATER,
        onPress: () => navigation.navigate('Water'),
      });
    }

    if (stats.belowHalfGoalWaterDays >= 2) {
      insights.push({
        key: 'water-low-days',
        icon: 'cup-off',
        text: `${stats.belowHalfGoalWaterDays} low-hydration day(s) were under 50% goal. Use fixed reminder times to prevent long gaps.`,
        color: DASH_MUTED,
        onPress: () => navigation.navigate('Reminders'),
      });
    }

    if (stats.weekProteinAvg > 0 && stats.weekProteinAvg < 65) {
      insights.push({
        key: 'protein-low',
        icon: 'food-drumstick',
        text: `Average protein is ${Math.round(stats.weekProteinAvg)} g/day. Add a protein source to breakfast to improve satiety.`,
        color: RING_CAL,
        onPress: () => navigation.navigate('Meals'),
      });
    }

    if (stats.lowMoveDays >= 4) {
      insights.push({
        key: 'move-low',
        icon: 'run-fast',
        text: `Movement was light on ${stats.lowMoveDays} days. Even 10-15 min walks after meals can close the gap.`,
        color: DASH_EXERCISE,
      });
    } else if (stats.activeMoveDays >= 4) {
      insights.push({
        key: 'move-strong',
        icon: 'run',
        text: `You hit 30+ move minutes on ${stats.activeMoveDays} days. That's a strong consistency pattern.`,
        color: DASH_EXERCISE,
      });
    }

    if (snapshot.heartLatest && snapshot.heartWeek.length >= 2) {
      const recent = snapshot.heartWeek.at(-1)?.avgBpm ?? snapshot.heartLatest.bpm;
      const baseline = avg(snapshot.heartWeek.slice(0, -1).map(d => d.avgBpm));
      const delta = Math.round(recent - baseline);
      if (baseline > 0 && delta >= 4) {
        insights.push({
          key: 'hr-up',
          icon: 'heart-pulse',
          text: `Average heart rate is up by ~${delta} bpm vs earlier this week. Consider lighter intensity and better hydration.`,
          color: DASH_HEART,
          onPress: () => navigation.navigate('Dashboard'),
        });
      } else if (baseline > 0 && delta <= -3) {
        insights.push({
          key: 'hr-down',
          icon: 'heart',
          text: `Heart-rate trend improved by ~${Math.abs(delta)} bpm this week. Recovery habits look good.`,
          color: DASH_HEART,
          onPress: () => navigation.navigate('Dashboard'),
        });
      }
    }

    if (insights.length < 3) {
      insights.push({
        key: 'exercise-preview',
        icon: 'information-outline',
        text: 'Exercise insights are using preview data for now; live workout syncing will improve recommendations.',
        color: DASH_MUTED,
      });
    }

    return insights.slice(0, 7);
  }, [snapshot, navigation, waterPct, moveExercise]);
}
