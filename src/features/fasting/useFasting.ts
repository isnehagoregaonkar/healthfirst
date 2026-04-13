import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { addCalendarDays, startOfLocalDay } from '../water/waterDayUtils';
import type {
  FastingReminderSettings,
  FastingSession,
  ScheduledFast,
  TimeOfDay,
} from './fastingTypes';
import { MAX_SCHEDULED_FASTS } from './fastingConstants';
import {
  DEFAULT_REMINDERS,
  loadFastingState,
  saveFastingState,
} from './fastingStorage';
import {
  cancelBreakNotification,
  scheduleBreakNotificationForStartedFast,
} from './fastingReminderNotifications';

function sessionOverlapsLocalDay(session: FastingSession, day: Date): boolean {
  const dayStart = startOfLocalDay(day).getTime();
  const dayEnd = addCalendarDays(day, 1).getTime();
  const st = new Date(session.startedAt).getTime();
  const en = new Date(session.endedAt).getTime();
  return en > dayStart && st < dayEnd;
}

function sessionId(): string {
  return `fast-${Date.now()}`;
}

function scheduledId(): string {
  return `sched-${Date.now()}`;
}

export function useFasting() {
  const [loading, setLoading] = useState(true);
  const [activeFastStartedAt, setActiveFastStartedAt] = useState<string | null>(
    null,
  );
  const [targetFastHours, setTargetFastHoursState] = useState(16);
  const [history, setHistory] = useState<FastingSession[]>([]);
  const [reminders, setReminders] =
    useState<FastingReminderSettings>(DEFAULT_REMINDERS);
  const [scheduledFasts, setScheduledFasts] = useState<ScheduledFast[]>([]);
  const [selectedDay, setSelectedDay] = useState(() => startOfLocalDay(new Date()));
  const [, bumpTick] = useReducer((c: number) => c + 1, 0);

  const selectDay = useCallback((d: Date) => {
    setSelectedDay(startOfLocalDay(d));
  }, []);

  const filteredHistory = useMemo(
    () => history.filter(h => sessionOverlapsLocalDay(h, selectedDay)),
    [history, selectedDay],
  );

  const refresh = useCallback(async () => {
    const s = await loadFastingState();
    setActiveFastStartedAt(s.activeFastStartedAt);
    setTargetFastHoursState(s.targetFastHours);
    setHistory(s.history);
    setReminders(s.reminders);
    setScheduledFasts(s.scheduledFasts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const isFasting = activeFastStartedAt != null;

  useEffect(() => {
    if (!isFasting) {
      return;
    }
    const id = setInterval(() => bumpTick(), 1000);
    return () => clearInterval(id);
  }, [isFasting]);

  const startedAtDate = useMemo(
    () =>
      activeFastStartedAt != null ? new Date(activeFastStartedAt) : null,
    [activeFastStartedAt],
  );

  // Recomputed each render; `bumpTick` runs every second while fasting so `Date.now()` advances in the UI.
  const elapsedMs =
    startedAtDate != null && !Number.isNaN(startedAtDate.getTime())
      ? Math.max(0, Date.now() - startedAtDate.getTime())
      : 0;

  const setTargetFastHours = useCallback(async (hours: number) => {
    const h = Math.min(24, Math.max(12, Math.round(hours)));
    setTargetFastHoursState(h);
    const s = await loadFastingState();
    await saveFastingState({
      ...s,
      targetFastHours: h,
    });
  }, []);

  const startFast = useCallback(async (options?: { breakAfterMin?: number }) => {
    const s = await loadFastingState();
    if (s.activeFastStartedAt) {
      return;
    }
    const started = new Date().toISOString();
    setActiveFastStartedAt(started);
    await saveFastingState({
      ...s,
      activeFastStartedAt: started,
    });
    if (s.reminders.enabled) {
      const breakAfterMin =
        options?.breakAfterMin != null
          ? Math.max(1, Math.round(options.breakAfterMin))
          : Math.round(s.targetFastHours * 60);
      await scheduleBreakNotificationForStartedFast(breakAfterMin / 60);
    }
  }, []);

  const patchReminders = useCallback(
    async (patch: Partial<FastingReminderSettings>) => {
      const s = await loadFastingState();
      const next: FastingReminderSettings = {
        enabled: patch.enabled ?? s.reminders.enabled,
        beginFast: patch.beginFast ?? s.reminders.beginFast,
        breakFast: patch.breakFast ?? s.reminders.breakFast,
      };
      setReminders(next);
      await saveFastingState({ ...s, reminders: next });
    },
    [],
  );

  const addScheduledFast = useCallback(
    async (input: {
      weekdays: readonly number[];
      startFast: TimeOfDay;
      endFast: TimeOfDay;
    }): Promise<boolean> => {
      const s = await loadFastingState();
      const row: ScheduledFast = {
        id: scheduledId(),
        weekdays: [...new Set(input.weekdays)].filter(d => d >= 0 && d <= 6).sort((a, b) => a - b),
        startFast: input.startFast,
        endFast: input.endFast,
      };
      if (row.weekdays.length === 0) {
        return false;
      }
      const existing = s.scheduledFasts ?? [];
      if (existing.length >= MAX_SCHEDULED_FASTS) {
        return false;
      }
      const next = [...existing, row];
      setScheduledFasts(next);
      await saveFastingState({ ...s, scheduledFasts: next });
      return true;
    },
    [],
  );

  const deleteScheduledFast = useCallback(async (id: string) => {
    const s = await loadFastingState();
    const next = (s.scheduledFasts ?? []).filter(x => x.id !== id);
    setScheduledFasts(next);
    await saveFastingState({ ...s, scheduledFasts: next });
  }, []);

  const endFast = useCallback(async () => {
    const s = await loadFastingState();
    if (!s.activeFastStartedAt) {
      return;
    }
    const end = new Date();
    const start = new Date(s.activeFastStartedAt);
    const durationMin = Math.max(
      1,
      Math.round((end.getTime() - start.getTime()) / 60_000),
    );
    const row: FastingSession = {
      id: sessionId(),
      startedAt: s.activeFastStartedAt,
      endedAt: end.toISOString(),
      targetHours: s.targetFastHours,
      durationMin,
    };
    const nextHistory = [row, ...s.history];
    setActiveFastStartedAt(null);
    setHistory(nextHistory);
    await saveFastingState({
      ...s,
      activeFastStartedAt: null,
      history: nextHistory,
    });
    await cancelBreakNotification();
  }, []);

  return {
    loading,
    refresh,
    isFasting,
    startedAtDate,
    elapsedMs,
    targetFastHours,
    setTargetFastHours,
    startFast,
    endFast,
    history,
    selectedDay,
    selectDay,
    filteredHistory,
    reminders,
    patchReminders,
    scheduledFasts,
    addScheduledFast,
    deleteScheduledFast,
  };
}
