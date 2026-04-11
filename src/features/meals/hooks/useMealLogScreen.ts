import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import {
  addMeal,
  addMealItem,
  updateMealItem,
  deleteMeal,
  deleteMealIfEmpty,
  deleteMealItem,
  getMealsForLocalDay,
  type DayMacroTotals,
  type LogMealItemPayload,
  type MealItemRow,
  type MealType,
  type MealWithItems,
} from '../../../services/meals';
import { addCalendarDays, isSameLocalDay, startOfLocalDay } from '../../water/waterDayUtils';

export type MealsGrouped = Readonly<Record<MealType, MealWithItems[]>>;
export type { DayMacroTotals } from '../../../services/meals';

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
  dayMacroTotals: DayMacroTotals;
  creatingMealType: MealType | null;
  itemSubmitting: boolean;
  refresh: () => Promise<void>;
  /** Creates a meal on `selectedDay` and returns its id, or null on failure. */
  startMeal: (mealType: MealType) => Promise<string | null>;
  submitFoodItem: (mealId: string, item: LogMealItemPayload) => Promise<string | null>;
  updateFoodItem: (itemId: string, item: LogMealItemPayload) => Promise<string | null>;
  confirmRemoveFoodItem: (item: MealItemRow, mealId: string) => void;
  confirmRemoveEmptyMeal: (mealId: string) => void;
  deletingItemId: string | null;
  deletingMealId: string | null;
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
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [deletingMealId, setDeletingMealId] = useState<string | null>(null);

  const grouped = useMemo(() => groupByType(meals), [meals]);

  const dayMacroTotals = useMemo((): DayMacroTotals => {
    const out = { proteinG: 0, carbsG: 0, fatG: 0, fiberG: 0 };
    for (const m of meals) {
      for (const it of m.items) {
        if (it.proteinG != null && Number.isFinite(it.proteinG)) {
          out.proteinG += it.proteinG;
        }
        if (it.carbsG != null && Number.isFinite(it.carbsG)) {
          out.carbsG += it.carbsG;
        }
        if (it.fatG != null && Number.isFinite(it.fatG)) {
          out.fatG += it.fatG;
        }
        if (it.fiberG != null && Number.isFinite(it.fiberG)) {
          out.fiberG += it.fiberG;
        }
      }
    }
    return out;
  }, [meals]);

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

  const updateFoodItem = useCallback(
    async (itemId: string, item: LogMealItemPayload): Promise<string | null> => {
      if (!Number.isFinite(item.calories) || item.calories < 0) {
        return 'Invalid calories.';
      }
      setItemSubmitting(true);
      setError(null);
      try {
        const result = await updateMealItem(itemId, item);
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

  const removeFoodItemById = useCallback(
    async (itemId: string, mealId: string) => {
      setDeletingItemId(itemId);
      setError(null);
      try {
        const result = await deleteMealItem(itemId);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        await deleteMealIfEmpty(mealId);
        await fetchDay(selectedDay, 'silent');
      } finally {
        setDeletingItemId(null);
      }
    },
    [fetchDay, selectedDay],
  );

  const confirmRemoveFoodItem = useCallback(
    (item: MealItemRow, mealId: string) => {
      Alert.alert('Remove this food?', item.name, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeFoodItemById(item.id, mealId).catch(() => {});
          },
        },
      ]);
    },
    [removeFoodItemById],
  );

  const removeEmptyMealById = useCallback(
    async (mealId: string) => {
      setDeletingMealId(mealId);
      setError(null);
      try {
        const result = await deleteMeal(mealId);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        await fetchDay(selectedDay, 'silent');
      } finally {
        setDeletingMealId(null);
      }
    },
    [fetchDay, selectedDay],
  );

  const confirmRemoveEmptyMeal = useCallback(
    (mealId: string) => {
      Alert.alert('Remove this meal?', 'This empty slot will be removed from your log.', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeEmptyMealById(mealId).catch(() => {});
          },
        },
      ]);
    },
    [removeEmptyMealById],
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
    dayMacroTotals,
    creatingMealType,
    itemSubmitting,
    refresh,
    startMeal,
    submitFoodItem,
    updateFoodItem,
    confirmRemoveFoodItem,
    confirmRemoveEmptyMeal,
    deletingItemId,
    deletingMealId,
    clearError,
  };
}
