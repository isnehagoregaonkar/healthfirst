export type FastingSession = Readonly<{
  id: string;
  startedAt: string;
  endedAt: string;
  targetHours: number;
  durationMin: number;
}>;

export type TimeOfDay = Readonly<{
  hour: number;
  minute: number;
}>;

export type FastingReminderSettings = Readonly<{
  enabled: boolean;
  /** Reminder to begin fasting (e.g. end eating window). */
  beginFast: TimeOfDay;
  /** Reminder to break fast / open eating window. */
  breakFast: TimeOfDay;
}>;

/** 0 = Sunday … 6 = Saturday (matches `Date.getDay()`). */
export type ScheduledFast = Readonly<{
  id: string;
  weekdays: readonly number[];
  /** Local time to start fasting on each selected weekday. */
  startFast: TimeOfDay;
  /** Local time to end / break the fast on each selected weekday. */
  endFast: TimeOfDay;
}>;

export type FastingPersisted = Readonly<{
  activeFastStartedAt: string | null;
  targetFastHours: number;
  history: FastingSession[];
  reminders: FastingReminderSettings;
  scheduledFasts: ScheduledFast[];
}>;

/** Which time field the shared fasting time picker is editing. */
export type FastingTimePickerTarget =
  | 'begin'
  | 'break'
  | 'schedule-start'
  | 'schedule-end'
  | null;
