import type { UsdaPer100g, UsdaPortionOption } from '../../services/usdaFdc';
import type { MealItemRow } from '../../services/meals';

/** Best-effort match of logged item to portion × servings from catalog options. */
export function inferPortionSelectionFromItem(
  item: MealItemRow,
  per100g: UsdaPer100g,
  opts: UsdaPortionOption[],
): Readonly<{ portionIndex: number; servingsText: string }> {
  let gramsTotal = 0;
  const k = per100g.kcal;
  const p = per100g.protein;
  if (k > 0.01 && item.calories > 0) {
    gramsTotal = (item.calories / k) * 100;
  }
  if (gramsTotal <= 0 && p > 0.01 && item.proteinG != null && item.proteinG > 0) {
    gramsTotal = (item.proteinG / p) * 100;
  }
  if (gramsTotal <= 0 || opts.length === 0) {
    const idx = opts.findIndex((o) => Math.abs(o.grams - 100) < 0.01);
    return { portionIndex: idx >= 0 ? idx : 0, servingsText: '1' };
  }

  let bestI = 0;
  let bestS = 1;
  let bestErr = Infinity;
  for (let i = 0; i < opts.length; i++) {
    const g = opts[i].grams;
    if (!(g > 0)) {
      continue;
    }
    const rawS = gramsTotal / g;
    if (!Number.isFinite(rawS) || rawS <= 0) {
      continue;
    }
    const s = Math.round(rawS * 100) / 100;
    const err = Math.abs(s * g - gramsTotal);
    if (err < bestErr) {
      bestErr = err;
      bestI = i;
      bestS = s;
    }
  }
  if (bestErr === Infinity) {
    const idx = opts.findIndex((o) => Math.abs(o.grams - 100) < 0.01);
    return { portionIndex: idx >= 0 ? idx : 0, servingsText: '1' };
  }
  return { portionIndex: bestI, servingsText: String(bestS) };
}
