import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import type { ExerciseSessionRow } from '../exerciseTypes';
import {
  appendManualExerciseSession,
  loadManualExerciseSessions,
} from '../storage/manualExerciseStorage';
import {
  fetchAndroidHealthSnapshot,
  fetchIosHealthSnapshot,
  openAndroidHealthSettings,
  openIosHealthSettings,
  saveManualWorkoutToAppleHealth,
} from '../services/platformHealth';

function mergeSessions(
  a: ExerciseSessionRow[],
  b: ExerciseSessionRow[],
): ExerciseSessionRow[] {
  const map = new Map<string, ExerciseSessionRow>();
  for (const row of [...a, ...b]) {
    map.set(row.id, row);
  }
  return [...map.values()].sort(
    (x, y) => new Date(y.startedAt).getTime() - new Date(x.startedAt).getTime(),
  );
}

function formatSessionTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function useExerciseScreen() {
  const [loading, setLoading] = useState(false);
  const [stepsToday, setStepsToday] = useState(0);
  const [healthWorkouts, setHealthWorkouts] = useState<ExerciseSessionRow[]>([]);
  const [manualSessions, setManualSessions] = useState<ExerciseSessionRow[]>([]);
  const [healthOk, setHealthOk] = useState(false);
  const [androidStatus, setAndroidStatus] = useState<
    'unavailable' | 'needs_install' | 'ready'
  >('unavailable');

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const manual = await loadManualExerciseSessions();
      setManualSessions(manual);

      if (Platform.OS === 'ios') {
        const snap = await fetchIosHealthSnapshot();
        setHealthOk(snap.ok);
        setStepsToday(snap.stepsToday);
        setHealthWorkouts(snap.workouts);
        setAndroidStatus('unavailable');
      } else if (Platform.OS === 'android') {
        const snap = await fetchAndroidHealthSnapshot();
        setHealthOk(snap.ok);
        setAndroidStatus(snap.status);
        setStepsToday(snap.stepsToday);
        setHealthWorkouts(snap.workouts);
      } else {
        setHealthOk(false);
        setStepsToday(0);
        setHealthWorkouts([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const combinedHistory = useMemo(
    () => mergeSessions(healthWorkouts, manualSessions),
    [healthWorkouts, manualSessions],
  );

  const integrationSubtitle = useMemo(() => {
    if (Platform.OS === 'ios') {
      return healthOk
        ? 'Reading steps and workouts from Apple Health.'
        : 'Enable access in the Health permission dialog, or Settings › Health › Data Access & Devices.';
    }
    if (Platform.OS === 'android') {
      if (androidStatus === 'needs_install') {
        return 'Health Connect is missing or needs an update. Tap below to open settings.';
      }
      return healthOk
        ? 'Reading steps and sessions from Health Connect.'
        : 'Grant Health Connect permissions when prompted, or open Health Connect settings.';
    }
    return 'Health sync runs on iPhone and Android.';
  }, [healthOk, androidStatus]);

  const logManual = useCallback(
    async (
      activityLabel: string,
      durationMin: number,
      syncToApple: boolean,
    ): Promise<void> => {
      const startedAt = new Date();
      const endedAt = new Date(startedAt.getTime() + durationMin * 60_000);
      const id = `manual-${startedAt.getTime()}`;
      const row: ExerciseSessionRow = {
        id,
        source: 'manual',
        title: activityLabel.trim() || 'Workout',
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
        durationMin: Math.max(1, Math.round(durationMin)),
      };
      await appendManualExerciseSession(row);
      setManualSessions(prev => mergeSessions([row], prev));
      if (syncToApple && Platform.OS === 'ios') {
        await saveManualWorkoutToAppleHealth(
          row.durationMin,
          startedAt,
          row.title,
        );
      }
    },
    [],
  );

  return {
    loading,
    refresh,
    stepsToday,
    combinedHistory,
    healthOk,
    androidStatus,
    integrationSubtitle,
    formatSessionTime,
    openAndroidHealthSettings,
    openIosHealthSettings,
    logManual,
  };
}
