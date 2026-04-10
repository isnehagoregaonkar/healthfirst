import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  loadMealCalorieProfile,
  type MealCalorieProfile,
  saveMealCalorieProfile,
  suggestedDailyCalories,
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

  const updateProfile = useCallback(async (next: MealCalorieProfile) => {
    await saveMealCalorieProfile(next);
    setProfile(next);
  }, []);

  return {
    profile,
    suggestedKcal,
    updateProfile,
    ready: profile !== null,
  };
}
