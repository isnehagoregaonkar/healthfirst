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
import { loadUserGoals } from '../../../services/goals';

export function useMealCalorieTarget() {
  const [profile, setProfile] = useState<MealCalorieProfile | null>(null);
  const [goalKcal, setGoalKcal] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    Promise.all([loadMealCalorieProfile(), loadUserGoals()]).then(([p, goals]) => {
      if (!alive) {
        return;
      }
      setProfile(p);
      setGoalKcal(goals.calorieIntakeGoal);
    });
    return () => {
      alive = false;
    };
  }, []);

  const suggestedKcal = useMemo(
    () => {
      if (goalKcal != null) {
        return goalKcal;
      }
      if (profile) {
        return suggestedDailyCalories(profile);
      }
      return 2000;
    },
    [goalKcal, profile],
  );

  const macroTargets = useMemo<MacroTargets | null>(
    () => (profile ? suggestedMacroTargets(profile) : null),
    [profile],
  );

  const bmi = useMemo<BmiInfo | null>(() => (profile ? computeBmi(profile) : null), [profile]);

  const updateProfile = useCallback(async (next: MealCalorieProfile) => {
    await saveMealCalorieProfile(next);
    setProfile(next);
    const goals = await loadUserGoals();
    setGoalKcal(goals.calorieIntakeGoal);
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
