import {
  addCalendarDays,
  isSameLocalDay,
  startOfLocalDay,
} from '../../features/water/waterDayUtils';

export type DayStripScope =
  /** Mon–Sun week that contains `selectedDay`. */
  | 'sevenDayWeek'
  /** Seven consecutive local days ending on `selectedDay` (oldest first). */
  | 'lastSevenRolling'
  /** Scrollable: `pastDayLimit` days through today (today rightmost). */
  | 'scrollablePast'
  /** Scrollable: `pastDayLimit` days strictly before today (no today chip). */
  | 'pastDaysOnlyScrollable';

const DEFAULT_PAST_LIMIT = 45;

export function isFutureLocalDay(d: Date, now: Date = new Date()): boolean {
  return startOfLocalDay(d).getTime() > startOfLocalDay(now).getTime();
}

export function startOfWeekMonday(day: Date): Date {
  const s = startOfLocalDay(day);
  const dow = s.getDay();
  const offset = dow === 0 ? -6 : 1 - dow;
  return addCalendarDays(s, offset);
}

export function weekDaysMondayGrid(anchorDay: Date): Date[] {
  const mon = startOfWeekMonday(anchorDay);
  return Array.from({ length: 7 }, (_, i) => addCalendarDays(mon, i));
}

function mergeSelectedIfMissing(days: Date[], selectedDay: Date): Date[] {
  const sel = startOfLocalDay(selectedDay);
  if (days.some(d => isSameLocalDay(d, sel))) {
    return days;
  }
  return [...days, sel].sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Ordered list of local calendar days for the horizontal strip (oldest / left → newest / right).
 */
export function buildDayStripDays(
  scope: DayStripScope,
  selectedDay: Date,
  pastDayLimit: number = DEFAULT_PAST_LIMIT,
): Date[] {
  const today = startOfLocalDay(new Date());
  const cap = Math.max(7, Math.min(120, pastDayLimit));

  switch (scope) {
    case 'sevenDayWeek':
      return weekDaysMondayGrid(selectedDay);
    case 'lastSevenRolling': {
      const end = startOfLocalDay(selectedDay);
      return Array.from({ length: 7 }, (_, i) => addCalendarDays(end, -6 + i));
    }
    case 'scrollablePast': {
      const out: Date[] = [];
      for (let i = cap; i >= 0; i -= 1) {
        out.push(addCalendarDays(today, -i));
      }
      return mergeSelectedIfMissing(out, selectedDay);
    }
    case 'pastDaysOnlyScrollable': {
      const out: Date[] = [];
      for (let i = cap; i >= 1; i -= 1) {
        out.push(addCalendarDays(today, -i));
      }
      return mergeSelectedIfMissing(out, selectedDay);
    }
    default:
      return weekDaysMondayGrid(selectedDay);
  }
}

export { DEFAULT_PAST_LIMIT };
