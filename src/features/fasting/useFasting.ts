import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FastingSession } from './fastingTypes';
import { loadFastingState, saveFastingState } from './fastingStorage';

function sessionId(): string {
  return `fast-${Date.now()}`;
}

export function useFasting() {
  const [loading, setLoading] = useState(true);
  const [activeFastStartedAt, setActiveFastStartedAt] = useState<string | null>(
    null,
  );
  const [targetFastHours, setTargetFastHoursState] = useState(16);
  const [history, setHistory] = useState<FastingSession[]>([]);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(async () => {
    const s = await loadFastingState();
    setActiveFastStartedAt(s.activeFastStartedAt);
    setTargetFastHoursState(s.targetFastHours);
    setHistory(s.history);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const isFasting = activeFastStartedAt != null;

  useEffect(() => {
    if (!isFasting) {
      return;
    }
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [isFasting]);

  const startedAtDate = useMemo(
    () =>
      activeFastStartedAt != null ? new Date(activeFastStartedAt) : null,
    [activeFastStartedAt],
  );

  const elapsedMs = useMemo(() => {
    if (!startedAtDate || Number.isNaN(startedAtDate.getTime())) {
      return 0;
    }
    return Math.max(0, Date.now() - startedAtDate.getTime());
  }, [startedAtDate, tick]);

  const setTargetFastHours = useCallback(async (hours: number) => {
    const h = Math.min(24, Math.max(12, Math.round(hours)));
    setTargetFastHoursState(h);
    const s = await loadFastingState();
    await saveFastingState({
      ...s,
      targetFastHours: h,
    });
  }, []);

  const startFast = useCallback(async () => {
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
  };
}
