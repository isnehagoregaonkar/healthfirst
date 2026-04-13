import type { TimeOfDay } from '../fasting/fastingTypes';

/** Eight reminders spread through daytime (local time), first at 9:00. */
export const WATER_REMINDER_SLOT_COUNT = 8;

/** Default slots from 9:00 through evening (~1.5h apart). */
export const DEFAULT_WATER_DAYTIMES: readonly TimeOfDay[] = [
  { hour: 9, minute: 0 },
  { hour: 10, minute: 30 },
  { hour: 12, minute: 0 },
  { hour: 13, minute: 30 },
  { hour: 15, minute: 0 },
  { hour: 16, minute: 30 },
  { hour: 18, minute: 0 },
  { hour: 19, minute: 30 },
];

export function waterNotifId(slotIndex: number): string {
  return `health-reminder-water-${slotIndex}`;
}

/** Cancel through this index so orphaned notifications from older 9-slot builds are cleared. */
export const WATER_NOTIF_CANCEL_THROUGH_INDEX = 8;

/** Legacy single-notif id (cancel on sync). */
export const WATER_NOTIF_ID_LEGACY = 'health-reminder-water';
