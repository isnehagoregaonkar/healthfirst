import AsyncStorage from '@react-native-async-storage/async-storage';
import { sanitizeLoggedQuantityLabel } from '../../services/usdaFdc';
import type { LogMealItemPayload } from '../../services/meals';

const STORAGE_KEY = '@healthfirst/meal_recent_foods_v1';
const MAX_ITEMS = 20;

export type StoredRecentFood = Readonly<LogMealItemPayload & { savedAt: number }>;

function dedupeKey(item: LogMealItemPayload): string {
  if (item.usdaFdcId != null && Number.isFinite(item.usdaFdcId)) {
    return `fdc:${item.usdaFdcId}`;
  }
  return `n:${item.name.trim().toLowerCase()}|${item.calories}|${item.quantity.trim().toLowerCase()}`;
}

function numOrNull(v: unknown): number | null {
  if (v == null) {
    return null;
  }
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function loadRecentFoods(): Promise<StoredRecentFood[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    const out: StoredRecentFood[] = [];
    for (const row of parsed) {
      if (!row || typeof row !== 'object') {
        continue;
      }
      const o = row as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name : '';
      const quantity = typeof o.quantity === 'string' ? o.quantity : '';
      const calories = Number(o.calories);
      if (!name || !Number.isFinite(calories)) {
        continue;
      }
      out.push({
        name,
        quantity: sanitizeLoggedQuantityLabel(quantity),
        calories,
        usdaFdcId: numOrNull(o.usdaFdcId),
        proteinG: numOrNull(o.proteinG),
        carbsG: numOrNull(o.carbsG),
        fatG: numOrNull(o.fatG),
        fiberG: numOrNull(o.fiberG),
        savedAt: typeof o.savedAt === 'number' ? o.savedAt : 0,
      });
    }
    return out;
  } catch {
    return [];
  }
}

export function recentFoodToPayload(item: StoredRecentFood): LogMealItemPayload {
  return {
    name: item.name,
    quantity: item.quantity,
    calories: item.calories,
    usdaFdcId: item.usdaFdcId ?? null,
    proteinG: item.proteinG ?? null,
    carbsG: item.carbsG ?? null,
    fatG: item.fatG ?? null,
    fiberG: item.fiberG ?? null,
  };
}

export async function rememberFoodAfterLog(item: LogMealItemPayload): Promise<void> {
  try {
    const prev = await loadRecentFoods();
    const entry: StoredRecentFood = {
      ...item,
      quantity: sanitizeLoggedQuantityLabel(item.quantity),
      savedAt: Date.now(),
    };
    const k = dedupeKey(item);
    const filtered = prev.filter((x) => dedupeKey(recentFoodToPayload(x)) !== k);
    const next = [entry, ...filtered].slice(0, MAX_ITEMS);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}
