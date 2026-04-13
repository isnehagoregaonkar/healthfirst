import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const STORAGE_KEY = 'healthfirst_meal_calorie_profile_v1';
const BODY_PROFILE_TABLE = 'user_body_profile';

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

function parsePartialProfile(p: Partial<MealCalorieProfile>): MealCalorieProfile {
  return {
    weightKg: typeof p.weightKg === 'number' ? p.weightKg : DEFAULT_PROFILE.weightKg,
    goalWeightKg:
      typeof p.goalWeightKg === 'number' ? p.goalWeightKg : DEFAULT_PROFILE.goalWeightKg,
    heightCm: typeof p.heightCm === 'number' ? p.heightCm : DEFAULT_PROFILE.heightCm,
    age: typeof p.age === 'number' ? p.age : DEFAULT_PROFILE.age,
    sex: p.sex === 'male' || p.sex === 'female' ? p.sex : DEFAULT_PROFILE.sex,
  };
}

async function loadLocalProfile(): Promise<MealCalorieProfile> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_PROFILE;
    }
    const p = JSON.parse(raw) as Partial<MealCalorieProfile>;
    return parsePartialProfile(p);
  } catch {
    return DEFAULT_PROFILE;
  }
}

async function writeLocalProfile(profile: MealCalorieProfile): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

type BodyProfileRow = Readonly<{
  weight_kg: number;
  goal_weight_kg: number;
  height_cm: number;
  age: number;
  sex: string;
}>;

function rowToProfile(row: BodyProfileRow): MealCalorieProfile {
  const sex: MealCalorieSex = row.sex === 'male' ? 'male' : 'female';
  return {
    weightKg: Number(row.weight_kg),
    goalWeightKg: Number(row.goal_weight_kg),
    heightCm: Number(row.height_cm),
    age: Math.round(Number(row.age)),
    sex,
  };
}

function isDefaultProfile(p: MealCalorieProfile): boolean {
  return (
    p.weightKg === DEFAULT_PROFILE.weightKg &&
    p.goalWeightKg === DEFAULT_PROFILE.goalWeightKg &&
    p.heightCm === DEFAULT_PROFILE.heightCm &&
    p.age === DEFAULT_PROFILE.age &&
    p.sex === DEFAULT_PROFILE.sex
  );
}

async function fetchBodyProfileFromSupabase(
  userId: string,
): Promise<MealCalorieProfile | null> {
  const { data, error } = await supabase
    .from(BODY_PROFILE_TABLE)
    .select('weight_kg, goal_weight_kg, height_cm, age, sex')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return rowToProfile(data as BodyProfileRow);
}

async function upsertBodyProfileToSupabase(
  userId: string,
  profile: MealCalorieProfile,
): Promise<void> {
  const { error } = await supabase.from(BODY_PROFILE_TABLE).upsert(
    {
      user_id: userId,
      weight_kg: profile.weightKg,
      goal_weight_kg: profile.goalWeightKg,
      height_cm: profile.heightCm,
      age: profile.age,
      sex: profile.sex,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );

  if (error) {
    throw new Error(error.message ?? 'Could not sync profile to the server.');
  }
}

/**
 * Loads body profile: when signed in, prefers Supabase row (cross-device), caches to AsyncStorage.
 * Falls back to local storage or defaults if offline / no row / not signed in.
 */
export async function loadMealCalorieProfile(): Promise<MealCalorieProfile> {
  const local = await loadLocalProfile();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return local;
  }

  try {
    const remote = await fetchBodyProfileFromSupabase(session.user.id);
    if (remote) {
      await writeLocalProfile(remote);
      return remote;
    }
    if (!isDefaultProfile(local)) {
      await upsertBodyProfileToSupabase(session.user.id, local);
    }
  } catch {
    /* use local below */
  }

  return local;
}

/**
 * Saves to device immediately, then upserts to Supabase when signed in.
 * Throws if cloud sync fails (local copy is still updated).
 */
export async function saveMealCalorieProfile(profile: MealCalorieProfile): Promise<void> {
  await writeLocalProfile(profile);

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    return;
  }

  await upsertBodyProfileToSupabase(session.user.id, profile);
}

/** Rough daily protein target from body weight (not medical advice). */
export function suggestedDailyProteinGrams(profile: MealCalorieProfile): number {
  const w = clamp(profile.weightKg, 30, 300);
  return Math.round(Math.min(160, Math.max(50, w * 1.8)));
}
