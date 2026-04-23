import { useCallback, useEffect, useMemo, useState } from 'react';
import type { UserGoals } from '../../../services/goals';
import {
  buildDefaultGoals,
  loadUserGoals,
  saveUserGoals,
} from '../../../services/goals';

function parseNumber(input: string): number {
  const cleaned = input.replace(',', '.').trim();
  return Number.parseFloat(cleaned);
}

function toText(v: number): string {
  if (Math.abs(v - Math.round(v)) < 0.001) {
    return String(Math.round(v));
  }
  return v.toFixed(1);
}

export function useGoalsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exerciseMinutes, setExerciseMinutes] = useState('');
  const [calorieIntake, setCalorieIntake] = useState('');
  const [calorieBurn, setCalorieBurn] = useState('');
  const [waterIntakeMl, setWaterIntakeMl] = useState('');
  const [targetWeightKg, setTargetWeightKg] = useState('');

  const applyGoalsToForm = useCallback((goals: UserGoals) => {
    setExerciseMinutes(toText(goals.exerciseMinutesGoal));
    setCalorieIntake(toText(goals.calorieIntakeGoal));
    setCalorieBurn(toText(goals.calorieBurnGoal));
    setWaterIntakeMl(toText(goals.waterIntakeGoalMl));
    setTargetWeightKg(toText(goals.targetWeightKg));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const goals = await loadUserGoals();
      applyGoalsToForm(goals);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load goals');
    } finally {
      setLoading(false);
    }
  }, [applyGoalsToForm]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const validateAndBuild = useCallback((): { goals: UserGoals } | { error: string } => {
    const exercise = parseNumber(exerciseMinutes);
    if (!Number.isFinite(exercise) || exercise < 5 || exercise > 300) {
      return { error: 'Exercise minutes goal must be between 5 and 300.' };
    }
    const intake = parseNumber(calorieIntake);
    if (!Number.isFinite(intake) || intake < 800 || intake > 6000) {
      return { error: 'Calorie intake goal must be between 800 and 6000.' };
    }
    const burn = parseNumber(calorieBurn);
    if (!Number.isFinite(burn) || burn < 50 || burn > 3000) {
      return { error: 'Burn calories goal must be between 50 and 3000.' };
    }
    const water = parseNumber(waterIntakeMl);
    if (!Number.isFinite(water) || water < 500 || water > 7000) {
      return { error: 'Water intake goal must be between 500 and 7000 ml.' };
    }
    const weight = parseNumber(targetWeightKg);
    if (!Number.isFinite(weight) || weight < 30 || weight > 300) {
      return { error: 'Target weight must be between 30 and 300 kg.' };
    }

    return {
      goals: {
        exerciseMinutesGoal: Math.round(exercise),
        calorieIntakeGoal: Math.round(intake),
        calorieBurnGoal: Math.round(burn),
        waterIntakeGoalMl: Math.round(water),
        targetWeightKg: Math.round(weight * 10) / 10,
      },
    };
  }, [calorieBurn, calorieIntake, exerciseMinutes, targetWeightKg, waterIntakeMl]);

  const save = useCallback(async (): Promise<{ ok: true } | { ok: false; message: string }> => {
    const validated = validateAndBuild();
    if ('error' in validated) {
      return { ok: false, message: validated.error };
    }
    setSaving(true);
    setError(null);
    try {
      await saveUserGoals(validated.goals);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e instanceof Error ? e.message : 'Could not save goals' };
    } finally {
      setSaving(false);
    }
  }, [validateAndBuild]);

  const applyDefaults = useCallback(async () => {
    const defaults = await buildDefaultGoals();
    applyGoalsToForm(defaults);
  }, [applyGoalsToForm]);

  const waterLiters = useMemo(() => {
    const n = parseNumber(waterIntakeMl);
    if (!Number.isFinite(n) || n <= 0) {
      return null;
    }
    return n / 1000;
  }, [waterIntakeMl]);

  return {
    loading,
    saving,
    error,
    refresh,
    save,
    applyDefaults,
    exerciseMinutes,
    setExerciseMinutes,
    calorieIntake,
    setCalorieIntake,
    calorieBurn,
    setCalorieBurn,
    waterIntakeMl,
    setWaterIntakeMl,
    targetWeightKg,
    setTargetWeightKg,
    waterLiters,
  };
}
