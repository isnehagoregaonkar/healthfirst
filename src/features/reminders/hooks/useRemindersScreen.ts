import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  DEFAULT_REMINDERS,
  loadFastingState,
  saveFastingState,
} from '../../fasting/fastingStorage';
import {
  requestFastingReminderPermission,
  syncFastingReminderNotifications,
} from '../../fasting/fastingReminderNotifications';
import type {
  FastingReminderSettings,
  TimeOfDay,
} from '../../fasting/fastingTypes';
import { isNotifeeNativePresent } from '../../../services/notifeeLazy';
import { syncGeneralReminderNotifications } from '../generalReminderNotifications';
import {
  DEFAULT_GENERAL_REMINDERS,
  loadGeneralRemindersSettings,
  saveGeneralRemindersSettings,
} from '../remindersSettingsStorage';
import type { GeneralRemindersPersisted } from '../remindersSettingsTypes';

export function useRemindersScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [general, setGeneral] =
    useState<GeneralRemindersPersisted>(DEFAULT_GENERAL_REMINDERS);
  const [fastingReminders, setFastingReminders] =
    useState<FastingReminderSettings>(DEFAULT_REMINDERS);

  const notifeeAvailable = useMemo(() => isNotifeeNativePresent(), []);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [g, f] = await Promise.all([
        loadGeneralRemindersSettings(),
        loadFastingState(),
      ]);
      setGeneral(g);
      setFastingReminders(f.reminders);
      await syncGeneralReminderNotifications(g);
      await syncFastingReminderNotifications(f.reminders);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload().catch(() => {});
    }, [reload]),
  );

  const persistGeneral = useCallback(async (next: GeneralRemindersPersisted) => {
    setSaving(true);
    try {
      await saveGeneralRemindersSettings(next);
      setGeneral(next);
      await syncGeneralReminderNotifications(next);
    } finally {
      setSaving(false);
    }
  }, []);

  const persistFastingReminders = useCallback(
    async (nextRm: FastingReminderSettings) => {
      setSaving(true);
      try {
        const s = await loadFastingState();
        await saveFastingState({ ...s, reminders: nextRm });
        setFastingReminders(nextRm);
        await syncFastingReminderNotifications(nextRm);
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const ensureNotifPermission = useCallback(async (): Promise<boolean> => {
    const { granted } = await requestFastingReminderPermission();
    return granted;
  }, []);

  const setWaterEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled && !(await ensureNotifPermission())) {
        return;
      }
      await persistGeneral({
        ...general,
        water: { ...general.water, enabled },
      });
    },
    [general, persistGeneral, ensureNotifPermission],
  );

  const setWaterTimeAtIndex = useCallback(
    async (index: number, time: TimeOfDay) => {
      const prev = [...general.water.times];
      if (index < 0 || index >= prev.length) {
        return;
      }
      prev[index] = time;
      await persistGeneral({
        ...general,
        water: { ...general.water, times: prev },
      });
    },
    [general, persistGeneral],
  );

  const setMealsEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled && !(await ensureNotifPermission())) {
        return;
      }
      await persistGeneral({
        ...general,
        meals: { ...general.meals, enabled },
      });
    },
    [general, persistGeneral, ensureNotifPermission],
  );

  const setMealSlotTime = useCallback(
    async (slot: 'breakfast' | 'lunch' | 'dinner', time: TimeOfDay) => {
      await persistGeneral({
        ...general,
        meals: { ...general.meals, [slot]: time },
      });
    },
    [general, persistGeneral],
  );

  const setFastingEnabled = useCallback(
    async (enabled: boolean) => {
      if (enabled && !(await ensureNotifPermission())) {
        return;
      }
      await persistFastingReminders({
        ...fastingReminders,
        enabled,
      });
    },
    [fastingReminders, persistFastingReminders, ensureNotifPermission],
  );

  const setFastingBeginTime = useCallback(
    async (beginFast: TimeOfDay) => {
      await persistFastingReminders({
        ...fastingReminders,
        beginFast,
      });
    },
    [fastingReminders, persistFastingReminders],
  );

  const setFastingBreakTime = useCallback(
    async (breakFast: TimeOfDay) => {
      await persistFastingReminders({
        ...fastingReminders,
        breakFast,
      });
    },
    [fastingReminders, persistFastingReminders],
  );

  return {
    loading,
    saving,
    notifeeAvailable,
    general,
    fastingReminders,
    reload,
    setWaterEnabled,
    setWaterTimeAtIndex,
    setMealsEnabled,
    setMealSlotTime,
    setFastingEnabled,
    setFastingBeginTime,
    setFastingBreakTime,
  };
}
