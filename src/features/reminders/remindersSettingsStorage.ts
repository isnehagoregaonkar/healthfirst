import AsyncStorage from '@react-native-async-storage/async-storage';
import type { TimeOfDay } from '../fasting/fastingTypes';
import type { GeneralRemindersPersisted, MealReminderSettings, WaterReminderSettings } from './remindersSettingsTypes';
import {
  DEFAULT_WATER_DAYTIMES,
  WATER_REMINDER_SLOT_COUNT,
} from './remindersWaterConstants';

const STORAGE_KEY = '@HealthFirst/general-reminders/v1';

function clampTime(raw: unknown, fallback: TimeOfDay): TimeOfDay {
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

function normalizeWaterTimes(arr: unknown[]): TimeOfDay[] {
  const out: TimeOfDay[] = [];
  for (let i = 0; i < WATER_REMINDER_SLOT_COUNT; i += 1) {
    const fallback = DEFAULT_WATER_DAYTIMES[i] ?? { hour: 12, minute: 0 };
    out.push(clampTime(arr[i], fallback));
  }
  return out;
}

const DEFAULT_WATER: WaterReminderSettings = {
  enabled: false,
  times: DEFAULT_WATER_DAYTIMES,
};

const DEFAULT_MEALS: MealReminderSettings = {
  enabled: false,
  breakfast: { hour: 8, minute: 30 },
  lunch: { hour: 12, minute: 30 },
  dinner: { hour: 18, minute: 30 },
};

export const DEFAULT_GENERAL_REMINDERS: GeneralRemindersPersisted = {
  v: 1,
  water: DEFAULT_WATER,
  meals: DEFAULT_MEALS,
};

function parseWater(raw: unknown): WaterReminderSettings {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_WATER;
  }
  const o = raw as Record<string, unknown>;
  const enabled = typeof o.enabled === 'boolean' ? o.enabled : false;

  if (Array.isArray(o.times)) {
    return {
      enabled,
      times: normalizeWaterTimes(o.times),
    };
  }

  // Legacy: single `time` field — migrate to nine default daytime slots.
  if (o.time != null && typeof o.time === 'object') {
    return {
      enabled,
      times: [...DEFAULT_WATER_DAYTIMES],
    };
  }

  return DEFAULT_WATER;
}

function parseMeals(raw: unknown): MealReminderSettings {
  if (!raw || typeof raw !== 'object') {
    return DEFAULT_MEALS;
  }
  const o = raw as Record<string, unknown>;
  return {
    enabled: typeof o.enabled === 'boolean' ? o.enabled : false,
    breakfast: clampTime(o.breakfast, DEFAULT_MEALS.breakfast),
    lunch: clampTime(o.lunch, DEFAULT_MEALS.lunch),
    dinner: clampTime(o.dinner, DEFAULT_MEALS.dinner),
  };
}

export async function loadGeneralRemindersSettings(): Promise<GeneralRemindersPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_GENERAL_REMINDERS;
    }
    const p = JSON.parse(raw) as Record<string, unknown>;
    if (p.v !== 1) {
      return DEFAULT_GENERAL_REMINDERS;
    }
    return {
      v: 1,
      water: parseWater(p.water),
      meals: parseMeals(p.meals),
    };
  } catch {
    return DEFAULT_GENERAL_REMINDERS;
  }
}

export async function saveGeneralRemindersSettings(
  next: GeneralRemindersPersisted,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
