import { useCallback, useEffect, useMemo, useState } from 'react';
import { PREFERRED_FAST_HOURS } from '../fastingConstants';
import { FASTING_MOTIVATION_LINES } from '../fastingMotivation';
import {
  requestFastingReminderPermission,
  syncFastingReminderNotifications,
} from '../fastingReminderNotifications';
import type { FastingTimePickerTarget, TimeOfDay } from '../fastingTypes';
import { useFasting } from '../useFasting';

const DEFAULT_SCHEDULE_START: TimeOfDay = { hour: 20, minute: 0 };
const DEFAULT_SCHEDULE_END: TimeOfDay = { hour: 12, minute: 0 };

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

  const [pickerTarget, setPickerTarget] = useState<FastingTimePickerTarget>(null);
  const [iosDraft, setIosDraft] = useState(() => new Date());
  const [reminderError, setReminderError] = useState<string | null>(null);

  const [scheduleEditorOpen, setScheduleEditorOpen] = useState(false);
  const [scheduleDraftWeekdays, setScheduleDraftWeekdays] = useState<number[]>(
    [],
  );
  const [scheduleDraftStart, setScheduleDraftStart] =
    useState<TimeOfDay>(DEFAULT_SCHEDULE_START);
  const [scheduleDraftEnd, setScheduleDraftEnd] =
    useState<TimeOfDay>(DEFAULT_SCHEDULE_END);
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
      if (!granted) {
        setReminderError('Allow notifications to receive fasting reminders.');
        return;
      }
      await patchReminders({ enabled: true });
    },
    [patchReminders],
  );

  const openTimePicker = useCallback(
    (target: Exclude<FastingTimePickerTarget, null>) => {
      let t: TimeOfDay;
      if (target === 'begin') {
        t = reminders.beginFast;
      } else if (target === 'break') {
        t = reminders.breakFast;
      } else if (target === 'schedule-start') {
        t = scheduleDraftStart;
      } else {
        t = scheduleDraftEnd;
      }
      const d = new Date();
      d.setHours(t.hour, t.minute, 0, 0);
      setIosDraft(d);
      setPickerTarget(target);
    },
    [reminders, scheduleDraftStart, scheduleDraftEnd],
  );

  const dismissPicker = useCallback(() => setPickerTarget(null), []);

  const commitAndroidTime = useCallback(
    async (date: Date) => {
      if (!pickerTarget) {
        return;
      }
      const nextT = { hour: date.getHours(), minute: date.getMinutes() };
      if (pickerTarget === 'begin') {
        await patchReminders({ beginFast: nextT });
      } else if (pickerTarget === 'break') {
        await patchReminders({ breakFast: nextT });
      } else if (pickerTarget === 'schedule-start') {
        setScheduleDraftStart(nextT);
      } else {
        setScheduleDraftEnd(nextT);
      }
      setPickerTarget(null);
    },
    [pickerTarget, patchReminders],
  );

  const confirmIosTime = useCallback(async () => {
    if (!pickerTarget) {
      return;
    }
    const nextT = {
      hour: iosDraft.getHours(),
      minute: iosDraft.getMinutes(),
    };
    if (pickerTarget === 'begin') {
      await patchReminders({ beginFast: nextT });
    } else if (pickerTarget === 'break') {
      await patchReminders({ breakFast: nextT });
    } else if (pickerTarget === 'schedule-start') {
      setScheduleDraftStart(nextT);
    } else {
      setScheduleDraftEnd(nextT);
    }
    setPickerTarget(null);
  }, [iosDraft, pickerTarget, patchReminders]);

  const cancelIosPicker = dismissPicker;

  const openScheduleEditor = useCallback(() => {
    setScheduleDraftWeekdays([]);
    setScheduleDraftStart(DEFAULT_SCHEDULE_START);
    setScheduleDraftEnd(DEFAULT_SCHEDULE_END);
    setScheduleEditorError(null);
    setScheduleEditorOpen(true);
  }, []);

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
    pickerTarget,
    iosDraft,
    setIosDraft,
    reminderError,
    toggleReminders,
    openTimePicker,
    commitAndroidTime,
    dismissPicker,
    confirmIosTime,
    cancelIosPicker,
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
  };
}
