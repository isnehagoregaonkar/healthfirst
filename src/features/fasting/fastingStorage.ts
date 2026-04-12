import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  FastingPersisted,
  FastingReminderSettings,
  FastingSession,
  ScheduledFast,
  TimeOfDay,
} from './fastingTypes';
import { MAX_SCHEDULED_FASTS } from './fastingConstants';

const STORAGE_KEY = '@HealthFirst/fasting/v1';
const MAX_HISTORY = 50;

export const DEFAULT_REMINDERS: FastingReminderSettings = {
  enabled: false,
  /** 9 PM — begin fasting (stop eating). */
  beginFast: { hour: 21, minute: 0 },
  /** 9 AM — break fast. */
  breakFast: { hour: 9, minute: 0 },
};

const DEFAULTS: FastingPersisted = {
  activeFastStartedAt: null,
  targetFastHours: 16,
  history: [],
  reminders: DEFAULT_REMINDERS,
  scheduledFasts: [],
};

function clampTimeOfDay(raw: unknown, fallback: TimeOfDay): TimeOfDay {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const o = raw as Record<string, unknown>;
  const hour =
    typeof o.hour === 'number' && Number.isFinite(o.hour)
      ? Math.min(23, Math.max(0, Math.round(o.hour)))
      : fallback.hour;
  const minute =
    typeof o.minute === 'number' && Number.isFinite(o.minute)
      ? Math.min(59, Math.max(0, Math.round(o.minute)))
      : fallback.minute;
  return { hour, minute };
}

function parseReminders(
  parsed: Record<string, unknown> | undefined,
): FastingReminderSettings {
  const r = parsed?.reminders;
  if (!r || typeof r !== 'object') {
    return DEFAULT_REMINDERS;
  }
  const o = r as Record<string, unknown>;
  return {
    enabled: typeof o.enabled === 'boolean' ? o.enabled : false,
    beginFast: clampTimeOfDay(o.beginFast, DEFAULT_REMINDERS.beginFast),
    breakFast: clampTimeOfDay(o.breakFast, DEFAULT_REMINDERS.breakFast),
  };
}

function clampHistory(list: FastingSession[]): FastingSession[] {
  return list.slice(0, MAX_HISTORY);
}

function parseWeekdays(raw: unknown): number[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const set = new Set<number>();
  for (const x of raw) {
    if (typeof x === 'number' && Number.isFinite(x)) {
      const d = Math.round(x);
      if (d >= 0 && d <= 6) {
        set.add(d);
      }
    }
  }
  return [...set].sort((a, b) => a - b);
}

function parseScheduledFast(raw: unknown): ScheduledFast | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' && o.id.length > 0 ? o.id : null;
  if (!id) {
    return null;
  }
  const weekdays = parseWeekdays(o.weekdays);
  const startFast = clampTimeOfDay(
    o.startFast,
    DEFAULT_REMINDERS.beginFast,
  );
  const endFast = clampTimeOfDay(o.endFast, DEFAULT_REMINDERS.breakFast);
  return { id, weekdays, startFast, endFast };
}

function parseScheduledFasts(parsed: Record<string, unknown> | undefined): ScheduledFast[] {
  const list = parsed?.scheduledFasts;
  if (!Array.isArray(list)) {
    return [];
  }
  const out: ScheduledFast[] = [];
  for (const item of list) {
    const row = parseScheduledFast(item);
    if (row && row.weekdays.length > 0) {
      out.push(row);
    }
  }
  return out.slice(0, MAX_SCHEDULED_FASTS);
}

export async function loadFastingState(): Promise<FastingPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULTS;
    }
    const parsed = JSON.parse(raw) as Partial<FastingPersisted> &
      Record<string, unknown>;
    return {
      activeFastStartedAt:
        typeof parsed.activeFastStartedAt === 'string' ||
        parsed.activeFastStartedAt === null
          ? parsed.activeFastStartedAt ?? null
          : null,
      targetFastHours:
        typeof parsed.targetFastHours === 'number' &&
        Number.isFinite(parsed.targetFastHours)
          ? Math.min(24, Math.max(12, Math.round(parsed.targetFastHours)))
          : DEFAULTS.targetFastHours,
      history: Array.isArray(parsed.history)
        ? clampHistory(parsed.history as FastingSession[])
        : [],
      reminders: parseReminders(parsed),
      scheduledFasts: parseScheduledFasts(parsed),
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveFastingState(state: FastingPersisted): Promise<void> {
  const next: FastingPersisted = {
    ...state,
    history: clampHistory([...state.history]),
    reminders: state.reminders ?? DEFAULT_REMINDERS,
    scheduledFasts: [...state.scheduledFasts].slice(0, MAX_SCHEDULED_FASTS),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
