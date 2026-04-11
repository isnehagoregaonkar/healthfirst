import type { ExerciseSessionRow } from '../exerciseTypes';
import {
  addCalendarDays,
  isSameLocalDay,
  startOfLocalDay,
} from '../../water/waterDayUtils';

export { addCalendarDays, isSameLocalDay, startOfLocalDay };

export function sessionStartedOnLocalDay(
  row: ExerciseSessionRow,
  day: Date,
): boolean {
  const t = new Date(row.startedAt).getTime();
  if (Number.isNaN(t)) {
    return false;
  }
  return isSameLocalDay(new Date(t), day);
}

export function filterSessionsForLocalDay(
  sessions: ExerciseSessionRow[],
  day: Date,
): ExerciseSessionRow[] {
  return sessions
    .filter(s => sessionStartedOnLocalDay(s, day))
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    );
}

/** Time only — for list rows when the day is already shown in the strip. */
export function formatSessionClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
