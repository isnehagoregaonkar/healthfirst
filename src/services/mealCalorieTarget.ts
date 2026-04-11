import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'healthfirst_meal_calorie_profile_v1';

export type MealCalorieSex = 'male' | 'female';

export type MealCalorieProfile = Readonly<{
  /** Body weight in kg */
  weightKg: number;
  /** Goal weight in kg */
  goalWeightKg: number;
  /** Height in cm */
  heightCm: number;
  age: number;
  sex: MealCalorieSex;
}>;

const DEFAULT_PROFILE: MealCalorieProfile = {
  weightKg: 72,
  goalWeightKg: 68,
  heightCm: 170,
  age: 32,
  sex: 'female',
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/** Mifflin–St Jeor BMR (kcal/day). */
export function mifflinBmrKg(profile: MealCalorieProfile): number {
  const w = clamp(profile.weightKg, 30, 300);
  const h = clamp(profile.heightCm, 120, 230);
  const a = clamp(profile.age, 14, 100);
  const base = 10 * w + 6.25 * h - 5 * a;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

/**
 * Rough daily calorie target: TDEE from moderate activity, adjusted toward goal weight.
 * Not medical advice — for in-app guidance only.
 */
export function suggestedDailyCalories(profile: MealCalorieProfile): number {
  const bmr = mifflinBmrKg(profile);
  const tdee = bmr * 1.375;
  const diff = profile.goalWeightKg - profile.weightKg;
  let target = tdee;
  if (diff < -0.5) {
    target = tdee - 500;
  } else if (diff > 0.5) {
    target = tdee + 300;
  }
  return Math.round(clamp(target, 1200, 4500));
}

export async function loadMealCalorieProfile(): Promise<MealCalorieProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    const p = JSON.parse(raw) as Partial<MealCalorieProfile>;
    return {
      weightKg: typeof p.weightKg === 'number' ? p.weightKg : DEFAULT_PROFILE.weightKg,
      goalWeightKg: typeof p.goalWeightKg === 'number' ? p.goalWeightKg : DEFAULT_PROFILE.goalWeightKg,
      heightCm: typeof p.heightCm === 'number' ? p.heightCm : DEFAULT_PROFILE.heightCm,
      age: typeof p.age === 'number' ? p.age : DEFAULT_PROFILE.age,
      sex: p.sex === 'male' || p.sex === 'female' ? p.sex : DEFAULT_PROFILE.sex,
    };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveMealCalorieProfile(profile: MealCalorieProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

/** Rough daily protein target from body weight (not medical advice). */
export function suggestedDailyProteinGrams(profile: MealCalorieProfile): number {
  const w = clamp(profile.weightKg, 30, 300);
  return Math.round(Math.min(160, Math.max(50, w * 1.8)));
}
