import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  addMeal,
  addMealItem,
  getMealsForLocalDay,
  type LogMealItemPayload,
  type MealType,
  type MealWithItems,
} from '../../../services/meals';
import { addCalendarDays, isSameLocalDay, startOfLocalDay } from '../../water/waterDayUtils';

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

type FetchMode = 'initial' | 'silent' | 'pull' | 'day';

export type UseMealLogScreenResult = Readonly<{
  selectedDay: Date;
  setSelectedDay: (d: Date) => void;
  goPrevDay: () => void;
  goNextDay: () => void;
  initialLoading: boolean;
  dayLoading: boolean;
  refreshing: boolean;
  error: string | null;
  meals: MealWithItems[];
  grouped: MealsGrouped;
  totalCalories: number;
  creatingMealType: MealType | null;
  itemSubmitting: boolean;
  refresh: () => Promise<void>;
  /** Creates a meal on `selectedDay` and returns its id, or null on failure. */
  startMeal: (mealType: MealType) => Promise<string | null>;
  submitFoodItem: (mealId: string, item: LogMealItemPayload) => Promise<string | null>;
  clearError: () => void;
}>;

export function useMealLogScreen(): UseMealLogScreenResult {
  const [selectedDay, setSelectedDayState] = useState(() => startOfLocalDay(new Date()));
  const [initialLoading, setInitialLoading] = useState(true);
  const [dayLoading, setDayLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meals, setMeals] = useState<MealWithItems[]>([]);
  const [totalCalories, setTotalCalories] = useState(0);
  const [creatingMealType, setCreatingMealType] = useState<MealType | null>(null);
  const [itemSubmitting, setItemSubmitting] = useState(false);

  const grouped = useMemo(() => groupByType(meals), [meals]);

  const setSelectedDay = useCallback((d: Date) => {
    setSelectedDayState(startOfLocalDay(d));
  }, []);

  const goPrevDay = useCallback(() => {
    setSelectedDayState((d) => addCalendarDays(d, -1));
  }, []);

  const goNextDay = useCallback(() => {
    setSelectedDayState((d) => {
      if (isSameLocalDay(d, new Date())) {
        return d;
      }
      return addCalendarDays(d, 1);
    });
  }, []);

  const fetchDay = useCallback(
    async (day: Date, mode: FetchMode) => {
      if (mode === 'initial') {
        setInitialLoading(true);
      } else if (mode === 'day') {
        setDayLoading(true);
      } else if (mode === 'pull') {
        setRefreshing(true);
      }
      if (mode !== 'silent') {
        setError(null);
      }

      const result = await getMealsForLocalDay(day);

      if (mode === 'initial') {
        setInitialLoading(false);
      }
      if (mode === 'day') {
        setDayLoading(false);
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
    },
    [],
  );

  const prevSelectedDayRef = useRef<Date | null>(null);
  useEffect(() => {
    const mode = prevSelectedDayRef.current === null ? 'initial' : 'day';
    prevSelectedDayRef.current = selectedDay;
    fetchDay(selectedDay, mode).catch(() => {});
  }, [selectedDay, fetchDay]);

  const refresh = useCallback(() => fetchDay(selectedDay, 'pull'), [fetchDay, selectedDay]);

  const startMeal = useCallback(
    async (mealType: MealType): Promise<string | null> => {
      setCreatingMealType(mealType);
      setError(null);
      try {
        const result = await addMeal(mealType, { day: selectedDay });
        if (!result.ok) {
          setError(result.error.message);
          return null;
        }
        await fetchDay(selectedDay, 'silent');
        return result.mealId;
      } finally {
        setCreatingMealType(null);
      }
    },
    [fetchDay, selectedDay],
  );

  const submitFoodItem = useCallback(
    async (mealId: string, item: LogMealItemPayload): Promise<string | null> => {
      if (!Number.isFinite(item.calories) || item.calories < 0) {
        return 'Invalid calories.';
      }
      setItemSubmitting(true);
      setError(null);
      try {
        const result = await addMealItem(mealId, item);
        if (!result.ok) {
          return result.error.message;
        }
        await fetchDay(selectedDay, 'silent');
        return null;
      } finally {
        setItemSubmitting(false);
      }
    },
    [fetchDay, selectedDay],
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    selectedDay,
    setSelectedDay,
    goPrevDay,
    goNextDay,
    initialLoading,
    dayLoading,
    refreshing,
    error,
    meals,
    grouped,
    totalCalories,
    creatingMealType,
    itemSubmitting,
    refresh,
    startMeal,
    submitFoodItem,
    clearError,
  };
}
