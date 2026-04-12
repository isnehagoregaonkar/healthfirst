export const PREFERRED_FAST_HOURS = [12, 14, 16, 18, 20] as const;

/** Max rows in persisted `scheduledFasts`. */
export const MAX_SCHEDULED_FASTS = 12;

/** index 0 = Sun … 6 = Sat */
export const WEEKDAY_SHORT_LABELS = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;
