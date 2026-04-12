import { WEEKDAY_SHORT_LABELS } from './fastingConstants';
import type { FastingSession, ScheduledFast } from './fastingTypes';

export function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  }
  return `${m}m ${String(sec).padStart(2, '0')}s`;
}

export function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDurationMin(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h <= 0) {
    return `${m} min`;
  }
  return `${h}h ${m}m`;
}

export function formatTimeOfDay(hour: number, minute: number): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function historySubtitle(row: FastingSession): string {
  return `${formatDurationMin(row.durationMin)} · goal ${row.targetHours}h fast`;
}

export function formatScheduledWeekdays(weekdays: readonly number[]): string {
  if (weekdays.length === 0) {
    return 'No days';
  }
  if (weekdays.length === 7) {
    return 'Every day';
  }
  return weekdays.map(d => WEEKDAY_SHORT_LABELS[d] ?? '?').join(' · ');
}

export function formatScheduledFastSummary(row: ScheduledFast): string {
  const days = formatScheduledWeekdays(row.weekdays);
  const a = formatTimeOfDay(row.startFast.hour, row.startFast.minute);
  const b = formatTimeOfDay(row.endFast.hour, row.endFast.minute);
  return `${days} · ${a} → ${b}`;
}
