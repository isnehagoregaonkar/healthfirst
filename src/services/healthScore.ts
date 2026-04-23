import type { DayMacroTotals } from './meals';
import type { MacroTargets } from './mealCalorieTarget';

type HealthPillarKey = 'nutrition' | 'hydration' | 'activity' | 'consistency';

export type HealthScoreBreakdown = Readonly<Record<HealthPillarKey, number>>;

export type HealthScoreModel = Readonly<{
  score: number;
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs focus';
  breakdown: HealthScoreBreakdown;
  hint: string;
}>;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function toPct(progress: number): number {
  return Math.round(clamp(progress, 0, 1) * 100);
}

function ratioScore(actual: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }
  const ratio = actual / target;
  const delta = Math.abs(ratio - 1);
  return Math.round(clamp(100 - delta * 120, 0, 100));
}

function progressScore(actual: number, target: number): number {
  if (!Number.isFinite(target) || target <= 0) {
    return 0;
  }
  return toPct(actual / target);
}

function average(scores: number[]): number {
  if (scores.length === 0) {
    return 0;
  }
  return Math.round(scores.reduce((acc, value) => acc + value, 0) / scores.length);
}

function scoreLabel(score: number): HealthScoreModel['label'] {
  if (score >= 85) {
    return 'Excellent';
  }
  if (score >= 70) {
    return 'Good';
  }
  if (score >= 55) {
    return 'Fair';
  }
  return 'Needs focus';
}

function weakestPillar(breakdown: HealthScoreBreakdown): HealthPillarKey {
  const entries = Object.entries(breakdown) as Array<[HealthPillarKey, number]>;
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0]?.[0] ?? 'consistency';
}

function buildHintFromWeakestPillar(pillar: HealthPillarKey): string {
  switch (pillar) {
    case 'nutrition':
      return 'Nutrition is lagging. Try staying closer to your calorie and macro targets.';
    case 'hydration':
      return 'Hydration is lagging. Add more water logs across the day.';
    case 'activity':
      return 'Activity is lagging. Aim for more exercise minutes today.';
    case 'consistency':
      return 'Consistency is lagging. Keep logging daily to build momentum.';
    default:
      return 'Keep logging consistently to improve your score.';
  }
}

export function buildDashboardHealthScore(params: {
  todayCalories: number;
  calorieTarget: number;
  todayMacros: DayMacroTotals;
  macroTargets: MacroTargets | null;
  waterTodayMl: number;
  waterGoalMl: number;
  exerciseTodayMin: number;
  exerciseGoalMin: number;
  streakDays: number;
}): HealthScoreModel {
  const macroScore = params.macroTargets
    ? average([
        ratioScore(params.todayMacros.proteinG, params.macroTargets.proteinG),
        ratioScore(params.todayMacros.carbsG, params.macroTargets.carbsG),
        ratioScore(params.todayMacros.fatG, params.macroTargets.fatG),
        ratioScore(params.todayMacros.fiberG, params.macroTargets.fiberG),
      ])
    : 0;

  const nutrition = average([
    ratioScore(params.todayCalories, params.calorieTarget),
    macroScore,
  ]);
  const hydration = progressScore(params.waterTodayMl, params.waterGoalMl);
  const activity = progressScore(params.exerciseTodayMin, params.exerciseGoalMin);
  const consistency = toPct(params.streakDays / 7);

  const breakdown: HealthScoreBreakdown = {
    nutrition,
    hydration,
    activity,
    consistency,
  };

  const score = Math.round(
    nutrition * 0.3 + hydration * 0.2 + activity * 0.3 + consistency * 0.2,
  );
  const label = scoreLabel(score);
  return {
    score,
    label,
    breakdown,
    hint: buildHintFromWeakestPillar(weakestPillar(breakdown)),
  };
}

export function buildProgressHealthScore(params: {
  daysCount: number;
  mealGoalHitDays: number;
  waterGoalHitDays: number;
  exerciseGoalHitDays: number;
  workoutDays: number;
  fastingSessions: number;
}): HealthScoreModel {
  const dayBase = Math.max(1, params.daysCount);
  const nutrition = toPct(params.mealGoalHitDays / dayBase);
  const hydration = toPct(params.waterGoalHitDays / dayBase);
  const activity = average([
    toPct(params.exerciseGoalHitDays / dayBase),
    toPct(params.workoutDays / dayBase),
  ]);
  const expectedFastingSessions = Math.max(1, Math.ceil(dayBase * 0.5));
  const consistency = average([
    toPct((params.mealGoalHitDays + params.waterGoalHitDays + params.exerciseGoalHitDays) / (dayBase * 3)),
    toPct(params.fastingSessions / expectedFastingSessions),
  ]);

  const breakdown: HealthScoreBreakdown = {
    nutrition,
    hydration,
    activity,
    consistency,
  };
  const score = Math.round(
    nutrition * 0.3 + hydration * 0.2 + activity * 0.3 + consistency * 0.2,
  );
  const label = scoreLabel(score);
  return {
    score,
    label,
    breakdown,
    hint: buildHintFromWeakestPillar(weakestPillar(breakdown)),
  };
}
