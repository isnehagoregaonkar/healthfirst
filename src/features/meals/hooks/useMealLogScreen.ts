import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addMeal,
  addMealItem,
  getMealsForToday,
  type MealType,
  type MealWithItems,
} from '../../../services/meals';

export type MealsGrouped = Readonly<Record<MealType, MealWithItems[]>>;

function emptyGrouped(): MealsGrouped {
  return {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  };
}

function groupByType(meals: MealWithItems[]): MealsGrouped {
  const g = emptyGrouped();
  for (const m of meals) {
    g[m.mealType].push(m);
  }
  return g;
}

type FetchMode = 'initial' | 'silent' | 'pull';

export type UseMealLogScreenResult = Readonly<{
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  grouped: MealsGrouped;
  totalCalories: number;
  activeMealId: string | null;
  activeMeal: MealWithItems | null;
  creatingMealType: MealType | null;
  itemSubmitting: boolean;
  refresh: () => Promise<void>;
  startMeal: (mealType: MealType) => Promise<void>;
  setActiveMealId: (id: string | null) => void;
  submitFoodItem: (name: string, quantity: string, calories: string) => Promise<string | null>;
  clearError: () => void;
}>;

export function useMealLogScreen(): UseMealLogScreenResult {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealWithItems[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [activeMealId, setActiveMealId] = useState<string | null>(null);
  const [creatingMealType, setCreatingMealType] = useState<MealType | null>(null);
  const [itemSubmitting, setItemSubmitting] = useState(false);

  const grouped = useMemo(() => groupByType(meals), [meals]);

  const activeMeal = useMemo(
    () => (activeMealId ? meals.find((m) => m.id === activeMealId) ?? null : null),
    [meals, activeMealId],
  );

  const fetchToday = useCallback(async (mode: FetchMode) => {
    if (mode === 'initial') {
      setLoading(true);
    }
    if (mode === 'pull') {
      setRefreshing(true);
    }
    if (mode !== 'silent') {
      setError(null);
    }
    const result = await getMealsForToday();
    if (mode === 'initial') {
      setLoading(false);
    }
    if (mode === 'pull') {
      setRefreshing(false);
    }
    if ('error' in result) {
      setError(result.error.message);
      return;
    }
    setMeals(result.meals);
    setTotalCalories(result.totalCalories);
  }, []);

  useEffect(() => {
    fetchToday('initial').catch(() => {});
  }, [fetchToday]);

  useEffect(() => {
    if (activeMealId && !meals.some((m) => m.id === activeMealId)) {
      setActiveMealId(null);
    }
  }, [meals, activeMealId]);

  const refresh = useCallback(() => fetchToday('pull'), [fetchToday]);

  const startMeal = useCallback(
    async (mealType: MealType) => {
      setCreatingMealType(mealType);
      setError(null);
      try {
        const result = await addMeal(mealType);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        await fetchToday('silent');
        setActiveMealId(result.mealId);
      } finally {
        setCreatingMealType(null);
      }
    },
    [fetchToday],
  );

  const submitFoodItem = useCallback(
    async (name: string, quantity: string, calories: string): Promise<string | null> => {
      if (!activeMealId) {
        return 'Select or create a meal first.';
      }
      const cal = Number.parseInt(calories.replaceAll(/\s/g, ''), 10);
      if (Number.isNaN(cal)) {
        return 'Enter calories as a whole number.';
      }
      setItemSubmitting(true);
      setError(null);
      try {
        const result = await addMealItem(activeMealId, name, quantity, cal);
        if (!result.ok) {
          return result.error.message;
        }
        await fetchToday('silent');
        return null;
      } finally {
        setItemSubmitting(false);
      }
    },
    [activeMealId, fetchToday],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    refreshing,
    error,
    grouped,
    totalCalories,
    activeMealId,
    activeMeal,
    creatingMealType,
    itemSubmitting,
    refresh,
    startMeal,
    setActiveMealId,
    submitFoodItem,
    clearError,
  };
}
