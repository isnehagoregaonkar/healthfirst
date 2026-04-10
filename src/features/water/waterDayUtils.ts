/** Local-calendar helpers (device timezone). */

/** 0–100 for progress UI. */
export function clampWaterPercent(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Locale time for intake log rows (e.g. "2:30 PM"). */
export function formatWaterEntryTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameLocalDay(a: Date, b: Date): boolean {
  return startOfLocalDay(a).getTime() === startOfLocalDay(b).getTime();
}

export function addCalendarDays(d: Date, days: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return startOfLocalDay(x);
}

export function formatDayShort(d: Date): string {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export type WaterDateNavLabels = Readonly<{
  leftLabel: string;
  rightLabel: string;
  centerLabel: string;
  canGoNext: boolean;
  isViewingToday: boolean;
}>;

export function getWaterDateNavLabels(selectedDay: Date): WaterDateNavLabels {
  const viewingToday = isSameLocalDay(selectedDay, new Date());
  const prev = addCalendarDays(selectedDay, -1);
  const next = addCalendarDays(selectedDay, 1);

  let rightLabel: string;
  if (viewingToday) {
    rightLabel = 'Tomorrow';
  } else if (isSameLocalDay(next, new Date())) {
    rightLabel = 'Today';
  } else {
    rightLabel = formatDayShort(next);
  }

  return {
    leftLabel: viewingToday ? 'Yesterday' : formatDayShort(prev),
    rightLabel,
    centerLabel: viewingToday ? 'Today' : formatDayShort(selectedDay),
    canGoNext: !viewingToday,
    isViewingToday: viewingToday,
  };
}
