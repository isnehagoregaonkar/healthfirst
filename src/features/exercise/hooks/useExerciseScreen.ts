import { useCallback, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { formatDayShort } from '../../water/waterDayUtils';
import {
  filterSessionsForLocalDay,
  isSameLocalDay,
  startOfLocalDay,
} from '../utils/exerciseDayUtils';
import type { ExerciseSessionRow } from '../exerciseTypes';
import {
  appendManualExerciseSession,
  loadManualExerciseSessions,
} from '../storage/manualExerciseStorage';
import {
  EMPTY_HEALTH_CONNECT_INSIGHT,
  type HealthConnectInsight,
  type HealthConnectStatus,
  fetchAndroidHealthSnapshot,
  fetchIosHealthSnapshot,
  openAndroidHealthSettings,
  openIosHealthApp,
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
  const [selectedDay, setSelectedDayState] = useState(() =>
    startOfLocalDay(new Date()),
  );
  const [loading, setLoading] = useState(false);
  const [stepsToday, setStepsToday] = useState(0);
  const [healthWorkouts, setHealthWorkouts] = useState<ExerciseSessionRow[]>([]);
  const [manualSessions, setManualSessions] = useState<ExerciseSessionRow[]>([]);
  const [healthOk, setHealthOk] = useState(false);
  const [iosHealthError, setIosHealthError] = useState<string | null>(null);
  const [appleHealthReadHint, setAppleHealthReadHint] = useState<string | null>(
    null,
  );
  const [androidStatus, setAndroidStatus] =
    useState<HealthConnectStatus>('unavailable');
  const [androidHealthHint, setAndroidHealthHint] = useState<string | null>(
    null,
  );
  const [healthConnectInsight, setHealthConnectInsight] =
    useState<HealthConnectInsight>(EMPTY_HEALTH_CONNECT_INSIGHT);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const manual = await loadManualExerciseSessions();
      setManualSessions(manual);

      if (Platform.OS === 'ios') {
        const snap = await fetchIosHealthSnapshot();
        setHealthOk(snap.ok);
        setIosHealthError(snap.errorMessage ?? null);
        setAppleHealthReadHint(snap.appleHealthReadHint ?? null);
        setStepsToday(snap.stepsToday);
        setHealthWorkouts(snap.workouts);
        setAndroidStatus('unavailable');
        setAndroidHealthHint(null);
        setHealthConnectInsight(EMPTY_HEALTH_CONNECT_INSIGHT);
      } else if (Platform.OS === 'android') {
        const snap = await fetchAndroidHealthSnapshot(selectedDay);
        setHealthOk(snap.ok);
        setIosHealthError(null);
        setAppleHealthReadHint(null);
        setAndroidStatus(snap.status);
        setAndroidHealthHint(snap.androidHealthHint ?? null);
        setStepsToday(snap.stepsToday);
        setHealthWorkouts(snap.workouts);
        setHealthConnectInsight(
          snap.healthConnectInsight ?? EMPTY_HEALTH_CONNECT_INSIGHT,
        );
      } else {
        setHealthOk(false);
        setIosHealthError(null);
        setAppleHealthReadHint(null);
        setStepsToday(0);
        setHealthWorkouts([]);
        setAndroidHealthHint(null);
        setHealthConnectInsight(EMPTY_HEALTH_CONNECT_INSIGHT);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDay]);

  const combinedHistory = useMemo(
    () => mergeSessions(healthWorkouts, manualSessions),
    [healthWorkouts, manualSessions],
  );

  const setSelectedDay = useCallback((d: Date) => {
    setSelectedDayState(startOfLocalDay(d));
  }, []);

  const isViewingToday = useMemo(
    () => isSameLocalDay(selectedDay, new Date()),
    [selectedDay],
  );

  const selectedDayLabel = useMemo(
    () => formatDayShort(selectedDay),
    [selectedDay],
  );

  const sessionsForSelectedDay = useMemo(
    () => filterSessionsForLocalDay(combinedHistory, selectedDay),
    [combinedHistory, selectedDay],
  );

  const integrationSubtitle = useMemo(() => {
    if (Platform.OS === 'ios') {
      return healthOk
        ? 'Reading steps and workouts from Apple Health (including Apple Watch). If counts look wrong, open Health › Data Access & Devices › HealthFirst and ensure Steps and Workouts are on.'
        : 'Apple Health is not listed under Settings › HealthFirst—that is normal. Manage access in Settings › Health › Data Access & Devices › HealthFirst, or open Exercise here and tap Sync now to see the permission prompt.';
    }
    if (Platform.OS === 'android') {
      if (androidStatus === 'needs_install') {
        return 'Health Connect is missing or needs an update. Tap below to open settings.';
      }
      if (androidStatus === 'permission_denied') {
        return 'Health Connect is installed but this app cannot read your data yet.';
      }
      return healthOk
        ? 'Reading steps and sessions from Health Connect (data from Samsung Health, Google Fit, etc. appears here only after they sync to Health Connect).'
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
    selectedDay,
    setSelectedDay,
    isViewingToday,
    selectedDayLabel,
    stepsToday,
    combinedHistory,
    sessionsForSelectedDay,
    healthOk,
    iosHealthError,
    appleHealthReadHint,
    androidStatus,
    androidHealthHint,
    healthConnectInsight,
    integrationSubtitle,
    formatSessionTime,
    openAndroidHealthSettings,
    openIosHealthApp,
    openIosHealthSettings,
    logManual,
  };
}
