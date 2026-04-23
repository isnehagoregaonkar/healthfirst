import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  computeBmi,
  loadMealCalorieProfile,
  suggestedDailyCalories,
} from './mealCalorieTarget';

const STORAGE_KEY = 'healthfirst_goals_v1';

export type UserGoals = Readonly<{
  exerciseMinutesGoal: number;
  calorieIntakeGoal: number;
  calorieBurnGoal: number;
  waterIntakeGoalMl: number;
  targetWeightKg: number;
}>;

function clampNumber(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function defaultExerciseMinutesForBmiCategory(
  category: ReturnType<typeof computeBmi>['category'],
): number {
  if (category === 'obese' || category === 'overweight') {
    return 40;
  }
  if (category === 'underweight') {
    return 25;
  }
  return 30;
}

export async function buildDefaultGoals(): Promise<UserGoals> {
  const profile = await loadMealCalorieProfile();
  const bmi = computeBmi(profile);
  const exerciseMinutesGoal = defaultExerciseMinutesForBmiCategory(bmi.category);
  const calorieIntakeGoal = suggestedDailyCalories(profile);
  const calorieBurnGoal = Math.round(exerciseMinutesGoal * 7.5);
  const waterIntakeGoalMl =
    Math.round(clampNumber(profile.weightKg * 35, 1800, 4200) / 100) * 100;
  return {
    exerciseMinutesGoal,
    calorieIntakeGoal,
    calorieBurnGoal,
    waterIntakeGoalMl,
    targetWeightKg: profile.goalWeightKg,
  };
}

function normalizeGoals(input: Partial<UserGoals>, fallback: UserGoals): UserGoals {
  const exerciseMinutesGoal = Number(input.exerciseMinutesGoal);
  const calorieIntakeGoal = Number(input.calorieIntakeGoal);
  const calorieBurnGoal = Number(input.calorieBurnGoal);
  const waterIntakeGoalMl = Number(input.waterIntakeGoalMl);
  const targetWeightKg = Number(input.targetWeightKg);

  return {
    exerciseMinutesGoal:
      Number.isFinite(exerciseMinutesGoal) && exerciseMinutesGoal > 0
        ? Math.round(clampNumber(exerciseMinutesGoal, 5, 300))
        : fallback.exerciseMinutesGoal,
    calorieIntakeGoal:
      Number.isFinite(calorieIntakeGoal) && calorieIntakeGoal > 0
        ? Math.round(clampNumber(calorieIntakeGoal, 800, 6000))
        : fallback.calorieIntakeGoal,
    calorieBurnGoal:
      Number.isFinite(calorieBurnGoal) && calorieBurnGoal > 0
        ? Math.round(clampNumber(calorieBurnGoal, 50, 3000))
        : fallback.calorieBurnGoal,
    waterIntakeGoalMl:
      Number.isFinite(waterIntakeGoalMl) && waterIntakeGoalMl > 0
        ? Math.round(clampNumber(waterIntakeGoalMl, 500, 7000))
        : fallback.waterIntakeGoalMl,
    targetWeightKg:
      Number.isFinite(targetWeightKg) && targetWeightKg > 0
        ? Math.round(clampNumber(targetWeightKg, 30, 300) * 10) / 10
        : fallback.targetWeightKg,
  };
}

export async function loadUserGoals(): Promise<UserGoals> {
  const defaults = await buildDefaultGoals();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<UserGoals>;
    return normalizeGoals(parsed, defaults);
  } catch {
    return defaults;
  }
}

export async function saveUserGoals(next: UserGoals): Promise<void> {
  const defaults = await buildDefaultGoals();
  const normalized = normalizeGoals(next, defaults);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}
