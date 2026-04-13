import type { TimeOfDay } from '../fasting/fastingTypes';

export function formatReminderTime(t: TimeOfDay): string {
  const d = new Date();
  d.setHours(t.hour, t.minute, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}
