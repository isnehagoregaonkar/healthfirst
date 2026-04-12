import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  addWaterIntake,
  DEFAULT_DAILY_GOAL_ML,
  deleteWaterIntake,
  getWaterDailyTotalsForRange,
  getWaterDaySnapshot,
  type WaterDayTotal,
  type WaterIntakeEntry,
} from '../../../services/water';
import { getWaterCoachingLines } from '../waterCoaching';
import {
  addCalendarDays,
  clampWaterPercent,
  formatDayShort,
  formatWaterEntryTime,
  getWaterDateNavLabels,
  startOfLocalDay,
} from '../waterDayUtils';
import { getDropletPalette } from '../WaterDropletProgress';

const COACHING_CLOCK_MS = 60_000;
const WEEK_DAY_COUNT = 7;

export type WaterCompareSlice = Readonly<{
  prev: WaterDayTotal;
  current: WaterDayTotal;
  compareTitle: string;
  leftLabel: string;
  rightLabel: string;
}>;

export type UseWaterIntakeScreenResult = Readonly<{
  goalMl: number;
  selectedDay: Date;
  selectDay: (d: Date) => void;
  dateNav: ReturnType<typeof getWaterDateNavLabels>;
  loading: boolean;
  error: string | null;
  totalMl: number;
  entries: WaterIntakeEntry[];
  weekTotals: WaterDayTotal[];
  percent: number;
  leftMl: number;
  coachingLines: ReturnType<typeof getWaterCoachingLines>;
  dropletPalette: ReturnType<typeof getDropletPalette>;
  timelineEntries: WaterIntakeEntry[];
  compareSlice: WaterCompareSlice | null;
  adding: boolean;
  deletingId: string | null;
  addMl: (ml: number) => Promise<void>;
  confirmRemoveEntry: (entry: WaterIntakeEntry) => void;
}>;

/**
 * Water intake screen: selected day, Supabase-backed totals / entries / week range,
 * coaching copy, and add / remove mutations with shared post-mutation sync.
 */
export function useWaterIntakeScreen(): UseWaterIntakeScreenResult {
  const goalMl = DEFAULT_DAILY_GOAL_ML;
  const [selectedDay, setSelectedDay] = useState(() => startOfLocalDay(new Date()));
  const [totalMl, setTotalMl] = useState(0);
  const [entries, setEntries] = useState<WaterIntakeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekTotals, setWeekTotals] = useState<WaterDayTotal[]>([]);
  const [coachingNow, setCoachingNow] = useState(() => new Date());

  const dateNav = useMemo(() => getWaterDateNavLabels(selectedDay), [selectedDay]);
  const { isViewingToday } = dateNav;

  const percent = useMemo(
    () => clampWaterPercent(goalMl > 0 ? (totalMl / goalMl) * 100 : 0),
    [totalMl, goalMl],
  );

  const leftMl = Math.max(0, goalMl - totalMl);

  const coachingLines = useMemo(
    () => getWaterCoachingLines(percent, isViewingToday, coachingNow),
    [percent, isViewingToday, coachingNow],
  );

  const dropletPalette = useMemo(() => getDropletPalette(percent), [percent]);

  const timelineEntries = useMemo(
    () =>
      [...entries].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
    [entries],
  );

  const compareSlice = useMemo((): WaterCompareSlice | null => {
    if (weekTotals.length < 2) {
      return null;
    }
    const prev = weekTotals[weekTotals.length - 2];
    const current = weekTotals[weekTotals.length - 1];
    return {
      prev,
      current,
      compareTitle: isViewingToday ? 'Today vs yesterday' : 'This day vs previous',
      leftLabel: formatDayShort(prev.date),
      rightLabel: formatDayShort(current.date),
    };
  }, [weekTotals, isViewingToday]);

  /** Refetch snapshot + week for the current `selectedDay` (no full-screen loading). */
  const syncDayAndWeek = useCallback(async (): Promise<boolean> => {
    const [snap, range] = await Promise.all([
      getWaterDaySnapshot(selectedDay),
      getWaterDailyTotalsForRange(selectedDay, WEEK_DAY_COUNT),
    ]);
    if ('error' in snap) {
      setError(snap.error.message);
      return false;
    }
    setError(null);
    setTotalMl(snap.totalMl);
    setEntries(snap.entries);
    if ('error' in range) {
      setWeekTotals([]);
    } else {
      setWeekTotals(range.days);
    }
    return true;
  }, [selectedDay]);

  useEffect(() => {
    const id = setInterval(() => {
      setCoachingNow(new Date());
    }, COACHING_CLOCK_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      setTotalMl(0);
      setEntries([]);
      setWeekTotals([]);

      const [snap, range] = await Promise.all([
        getWaterDaySnapshot(selectedDay),
        getWaterDailyTotalsForRange(selectedDay, WEEK_DAY_COUNT),
      ]);

      if (cancelled) {
        return;
      }

      if ('error' in snap) {
        setError(snap.error.message);
      } else {
        setTotalMl(snap.totalMl);
        setEntries(snap.entries);
      }
      if ('error' in range) {
        setWeekTotals([]);
      } else {
        setWeekTotals(range.days);
      }
      setLoading(false);
    };

    load().catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [selectedDay]);

  const addMl = useCallback(
    async (ml: number) => {
      if (!isViewingToday) {
        return;
      }
      setError(null);
      const before = totalMl;
      setTotalMl(before + ml);
      setAdding(true);
      try {
        const result = await addWaterIntake(ml);
        if (!result.ok) {
          setTotalMl(before);
          setError(result.error.message);
          return;
        }
        const ok = await syncDayAndWeek();
        if (!ok) {
          setTotalMl(before);
        }
      } finally {
        setAdding(false);
      }
    },
    [isViewingToday, totalMl, syncDayAndWeek],
  );

  const removeEntryById = useCallback(
    async (entryId: string) => {
      setDeletingId(entryId);
      setError(null);
      try {
        const result = await deleteWaterIntake(entryId);
        if (!result.ok) {
          setError(result.error.message);
          return;
        }
        await syncDayAndWeek();
      } finally {
        setDeletingId(null);
      }
    },
    [syncDayAndWeek],
  );

  const confirmRemoveEntry = useCallback(
    (entry: WaterIntakeEntry) => {
      const timeLabel = formatWaterEntryTime(entry.createdAt);
      Alert.alert(
        'Remove this entry?',
        timeLabel
          ? `Remove ${entry.amountMl} ml logged at ${timeLabel}?`
          : `Remove ${entry.amountMl} ml?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              removeEntryById(entry.id).catch(() => {});
            },
          },
        ],
      );
    },
    [removeEntryById],
  );

  const selectDay = useCallback((d: Date) => {
    setSelectedDay(startOfLocalDay(d));
  }, []);

  return {
    goalMl,
    selectedDay,
    selectDay,
    dateNav,
    loading,
    error,
    totalMl,
    entries,
    weekTotals,
    percent,
    leftMl,
    coachingLines,
    dropletPalette,
    timelineEntries,
    compareSlice,
    adding,
    deletingId,
    addMl,
    confirmRemoveEntry,
  };
}
