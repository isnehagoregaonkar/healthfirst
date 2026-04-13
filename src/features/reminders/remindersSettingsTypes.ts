import type { TimeOfDay } from '../fasting/fastingTypes';

export type WaterReminderSettings = Readonly<{
  enabled: boolean;
  /** Exactly nine daytime reminder times (local). */
  times: readonly TimeOfDay[];
}>;

export type MealReminderSettings = Readonly<{
  enabled: boolean;
  breakfast: TimeOfDay;
  lunch: TimeOfDay;
  dinner: TimeOfDay;
}>;

export type GeneralRemindersPersisted = Readonly<{
  v: 1;
  water: WaterReminderSettings;
  meals: MealReminderSettings;
}>;
