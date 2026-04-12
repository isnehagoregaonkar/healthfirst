import { useCallback, useEffect, useMemo, useState } from 'react';
import { PREFERRED_FAST_HOURS } from '../fastingConstants';
import { FASTING_MOTIVATION_LINES } from '../fastingMotivation';
import {
  requestFastingReminderPermission,
  syncFastingReminderNotifications,
} from '../fastingReminderNotifications';
import type { TimeOfDay } from '../fastingTypes';
import { DEFAULT_REMINDERS } from '../fastingStorage';
import { useFasting } from '../useFasting';

export function useIntermittentFastingScreen() {
  const fasting = useFasting();
  const {
    loading,
    isFasting,
    elapsedMs,
    targetFastHours,
    setTargetFastHours,
    startFast,
    endFast,
    selectedDay,
    selectDay,
    filteredHistory,
    reminders,
    patchReminders,
    scheduledFasts,
    addScheduledFast,
    deleteScheduledFast,
  } = fasting;

  const [reminderError, setReminderError] = useState<string | null>(null);

  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [scheduleDraftWeekdays, setScheduleDraftWeekdays] = useState<number[]>(
    [],
  );
  /** Default 9 PM → 9 AM; synced from `reminders` after load / when opening the editor. */
  const [scheduleDraftStart, setScheduleDraftStart] = useState<TimeOfDay>(
    DEFAULT_REMINDERS.beginFast,
  );
  const [scheduleDraftEnd, setScheduleDraftEnd] = useState<TimeOfDay>(
    DEFAULT_REMINDERS.breakFast,
  );
  const [scheduleEditorError, setScheduleEditorError] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (loading) {
      return;
    }
    void syncFastingReminderNotifications(reminders).catch(() => {
      /* errors are logged inside sync; avoid unhandled rejection */
    });
  }, [loading, reminders]);

  const progressPct = useMemo(() => {
    if (!isFasting) {
      return 0;
    }
    const targetMs = targetFastHours * 3600 * 1000;
    return Math.min(100, (elapsedMs / Math.max(targetMs, 1)) * 100);
  }, [isFasting, elapsedMs, targetFastHours]);

  const eatingHours = useMemo(
    () => Math.max(0, 24 - targetFastHours),
    [targetFastHours],
  );

  const motivationalLine = useMemo(() => {
    const d = selectedDay;
    const seed =
      d.getFullYear() * 366 + (d.getMonth() + 1) * 31 + d.getDate();
    return FASTING_MOTIVATION_LINES[seed % FASTING_MOTIVATION_LINES.length];
  }, [selectedDay]);

  const toggleReminders = useCallback(
    async (enabled: boolean) => {
      setReminderError(null);
      if (!enabled) {
        await patchReminders({ enabled: false });
        return;
      }
      const { granted } = await requestFastingReminderPermission();
      await patchReminders({ enabled: true });
      if (!granted) {
        setReminderError(
          'Reminders are saved, but this device is blocking alerts. Allow notifications for HealthFirst in Settings to hear them.',
        );
      }
    },
    [patchReminders],
  );

  const onScheduleStartTimeChange = useCallback(
    (date: Date) => {
      const nextT = { hour: date.getHours(), minute: date.getMinutes() };
      setScheduleDraftStart(nextT);
      void patchReminders({ beginFast: nextT });
    },
    [patchReminders],
  );

  const onScheduleEndTimeChange = useCallback(
    (date: Date) => {
      const nextT = { hour: date.getHours(), minute: date.getMinutes() };
      setScheduleDraftEnd(nextT);
      void patchReminders({ breakFast: nextT });
    },
    [patchReminders],
  );

  const openScheduleEditor = useCallback(() => {
    setScheduleDraftWeekdays([]);
    setScheduleDraftStart(reminders.beginFast);
    setScheduleDraftEnd(reminders.breakFast);
    setScheduleEditorError(null);
    setScheduleEditorOpen(true);
  }, [reminders.beginFast, reminders.breakFast]);

  const closeScheduleEditor = useCallback(() => {
    setScheduleEditorOpen(false);
    setScheduleEditorError(null);
  }, []);

  const toggleScheduleWeekday = useCallback((day: number) => {
    setScheduleDraftWeekdays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day].sort((a, b) => a - b),
    );
  }, []);

  const saveScheduleDraft = useCallback(async () => {
    if (scheduleDraftWeekdays.length === 0) {
      setScheduleEditorError('Choose at least one day.');
      return;
    }
    const ok = await addScheduledFast({
      weekdays: scheduleDraftWeekdays,
      startFast: scheduleDraftStart,
      endFast: scheduleDraftEnd,
    });
    if (!ok) {
      setScheduleEditorError(
        'Could not save. You may already have the maximum number of schedules.',
      );
      return;
    }
    setScheduleEditorOpen(false);
    setScheduleEditorError(null);
  }, [
    addScheduledFast,
    scheduleDraftEnd,
    scheduleDraftStart,
    scheduleDraftWeekdays,
  ]);

  return {
    loading,
    isFasting,
    elapsedMs,
    targetFastHours,
    setTargetFastHours,
    startFast,
    endFast,
    selectedDay,
    selectDay,
    filteredHistory,
    reminders,
    preferredFastHours: PREFERRED_FAST_HOURS,
    progressPct,
    eatingHours,
    motivationalLine,
    reminderError,
    toggleReminders,
    scheduledFasts,
    deleteScheduledFast,
    scheduleEditorOpen,
    scheduleDraftWeekdays,
    scheduleDraftStart,
    scheduleDraftEnd,
    scheduleEditorError,
    openScheduleEditor,
    closeScheduleEditor,
    toggleScheduleWeekday,
    saveScheduleDraft,
    onScheduleStartTimeChange,
    onScheduleEndTimeChange,
  };
}
