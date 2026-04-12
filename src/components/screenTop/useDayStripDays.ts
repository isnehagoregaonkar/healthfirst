import { useMemo } from 'react';
import {
  buildDayStripDays,
  type DayStripScope,
  DEFAULT_PAST_LIMIT,
} from './dayStripModel';

/**
 * Memoized strip day list for date mode. Keeps strip building out of the UI component.
 */
export function useDayStripDays(
  scope: DayStripScope,
  selectedDay: Date,
  pastDayLimit: number = DEFAULT_PAST_LIMIT,
): Date[] {
  return useMemo(
    () => buildDayStripDays(scope, selectedDay, pastDayLimit),
    [scope, selectedDay, pastDayLimit],
  );
}
