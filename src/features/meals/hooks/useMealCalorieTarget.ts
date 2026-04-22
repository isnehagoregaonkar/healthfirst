import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  computeBmi,
  loadMealCalorieProfile,
  type BmiInfo,
  type MacroTargets,
  type MealCalorieProfile,
  saveMealCalorieProfile,
  suggestedDailyCalories,
  suggestedMacroTargets,
} from '../../../services/mealCalorieTarget';

export function useMealCalorieTarget() {
  const [profile, setProfile] = useState<MealCalorieProfile | null>(null);

  useEffect(() => {
    let alive = true;
    loadMealCalorieProfile().then((p) => {
      if (alive) {
        setProfile(p);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const suggestedKcal = useMemo(
    () => (profile ? suggestedDailyCalories(profile) : 2000),
    [profile],
  );

  const macroTargets = useMemo<MacroTargets | null>(
    () => (profile ? suggestedMacroTargets(profile) : null),
    [profile],
  );

  const bmi = useMemo<BmiInfo | null>(() => (profile ? computeBmi(profile) : null), [profile]);

  const updateProfile = useCallback(async (next: MealCalorieProfile) => {
    await saveMealCalorieProfile(next);
    setProfile(next);
  }, []);

  return {
    profile,
    suggestedKcal,
    macroTargets,
    bmi,
    updateProfile,
    ready: profile !== null,
  };
}
