import type { TimeOfDay } from './fastingTypes';

/** Preset overnight fast lengths shown in the schedule editor. */
export const SCHEDULE_FAST_DURATION_PRESETS = [12, 14, 16, 20] as const;

export type ScheduleFastPresetHours =
  (typeof SCHEDULE_FAST_DURATION_PRESETS)[number];

function toMinutes(t: TimeOfDay): number {
  return t.hour * 60 + t.minute;
}

/**
 * Minutes of fasting from `startFast` (begin fasting) to `endFast` (break fast).
 * If `endFast` is earlier on the clock than `startFast`, the window crosses midnight.
 */
export function fastWindowMinutes(start: TimeOfDay, end: TimeOfDay): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  if (e <= s) {
    return 24 * 60 - s + e;
  }
  return e - s;
}

/** Which preset matches the current start/end, or `null` if custom (or non-integer hours). */
export function matchingSchedulePreset(
  start: TimeOfDay,
  end: TimeOfDay,
): ScheduleFastPresetHours | null {
  const m = fastWindowMinutes(start, end);
  if (m % 60 !== 0) {
    return null;
  }
  const h = m / 60;
  for (const p of SCHEDULE_FAST_DURATION_PRESETS) {
    if (h === p) {
      return p;
    }
  }
  return null;
}

/** Compact label for the custom-duration chip (e.g. `13h`, `12h30m`). */
export function formatCustomFastDurationLabel(
  start: TimeOfDay,
  end: TimeOfDay,
): string {
  const total = fastWindowMinutes(start, end);
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (h <= 0) {
    return `${m}m`;
  }
  if (m === 0) {
    return `${h}h`;
  }
  return `${h}h${m}m`;
}

/**
 * Start fasting time for an overnight fast of `durationHours` ending at `endFast`.
 */
export function startTimeForOvernightDuration(
  end: TimeOfDay,
  durationHours: ScheduleFastPresetHours,
): TimeOfDay {
  const endM = toMinutes(end);
  const durM = durationHours * 60;
  const startM = (24 * 60 + endM - durM) % (24 * 60);
  return { hour: Math.floor(startM / 60), minute: startM % 60 };
}
