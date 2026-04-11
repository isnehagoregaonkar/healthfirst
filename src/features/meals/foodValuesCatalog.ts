import rawCatalog from '../../../data/food-values.json';
import type { UsdaPer100g, UsdaPortionOption } from '../../services/usdaFdc';

export type FoodValueUnit = Readonly<{
  name: string;
  grams: number;
}>;

export type FoodValueEntry = Readonly<{
  name: string;
  category: string;
  nutrition_per_100g: Readonly<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  units: readonly FoodValueUnit[];
}>;

export const FOOD_VALUES_CATALOG = rawCatalog as readonly FoodValueEntry[];

/** Match a logged display name to a food-values row (for edit / portions). */
export function findFoodValueEntryByName(name: string): FoodValueEntry | null {
  const t = name.trim().toLowerCase();
  if (!t) {
    return null;
  }
  for (const e of FOOD_VALUES_CATALOG) {
    if (e.name.toLowerCase() === t) {
      return e;
    }
  }
  let best: FoodValueEntry | null = null;
  for (const e of FOOD_VALUES_CATALOG) {
    const n = e.name.toLowerCase();
    if (t.includes(n) || n.includes(t)) {
      if (!best || n.length > best.name.length) {
        best = e;
      }
    }
  }
  return best;
}

export function foodValueToPer100g(entry: FoodValueEntry): UsdaPer100g {
  const n = entry.nutrition_per_100g;
  return {
    kcal: n.calories,
    protein: n.protein,
    carbs: n.carbs,
    fat: n.fat,
    fiber: 0,
  };
}

/** Serving options from the catalog, then 100 g for manual scaling. Gram weights de-duped. */
export function foodValuePortionOptions(entry: FoodValueEntry): UsdaPortionOption[] {
  const out: UsdaPortionOption[] = [];
  const seen = new Set<string>();

  const push = (label: string, grams: number) => {
    if (!Number.isFinite(grams) || grams <= 0) {
      return;
    }
    const k = grams.toFixed(1);
    if (seen.has(k)) {
      return;
    }
    seen.add(k);
    out.push({ label, grams });
  };

  for (const u of entry.units) {
    push(u.name.trim() || `${u.grams} g`, u.grams);
  }
  push('100 g', 100);

  return out;
}

export function searchFoodValues(query: string, limit = 16): FoodValueEntry[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) {
    return [];
  }
  const tokens = q.split(/\s+/).filter(Boolean);
  const matches: FoodValueEntry[] = [];
  for (const e of FOOD_VALUES_CATALOG) {
    const n = e.name.toLowerCase();
    const cat = e.category.toLowerCase();
    const hit =
      n.includes(q) ||
      cat.includes(q) ||
      tokens.every((t) => n.includes(t) || cat.includes(t));
    if (hit) {
      matches.push(e);
    }
  }
  matches.sort((a, b) => {
    const na = a.name.toLowerCase();
    const nb = b.name.toLowerCase();
    const pos = (s: string) => (s.startsWith(q) ? -1 : s.indexOf(q));
    const pa = pos(na);
    const pb = pos(nb);
    if (pa !== pb) {
      return pa - pb;
    }
    return na.localeCompare(nb);
  });
  return matches.slice(0, limit);
}

export function formatFoodValueDisplayName(entry: FoodValueEntry): string {
  return entry.name.replace(/\b\w/g, (ch) => ch.toUpperCase());
}
