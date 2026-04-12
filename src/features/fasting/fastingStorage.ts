import AsyncStorage from '@react-native-async-storage/async-storage';
import type { FastingPersisted, FastingSession } from './fastingTypes';

const STORAGE_KEY = '@HealthFirst/fasting/v1';
const MAX_HISTORY = 50;

const DEFAULTS: FastingPersisted = {
  activeFastStartedAt: null,
  targetFastHours: 16,
  history: [],
};

function clampHistory(list: FastingSession[]): FastingSession[] {
  return list.slice(0, MAX_HISTORY);
}

export async function loadFastingState(): Promise<FastingPersisted> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULTS;
    }
    const parsed = JSON.parse(raw) as Partial<FastingPersisted>;
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
    };
  } catch {
    return DEFAULTS;
  }
}

export async function saveFastingState(state: FastingPersisted): Promise<void> {
  const next: FastingPersisted = {
    ...state,
    history: clampHistory([...state.history]),
  };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}
