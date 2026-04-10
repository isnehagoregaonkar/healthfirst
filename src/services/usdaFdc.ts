import { USDA_FDC_API_KEY } from '@env';

const FDC_BASE = 'https://api.nal.usda.gov/fdc/v1';

function requireApiKey(): string {
  const k = (USDA_FDC_API_KEY ?? '').trim();
  if (!k) {
    throw new Error('Missing USDA_FDC_API_KEY in .env');
  }
  return k;
}

export type UsdaSearchHit = Readonly<{
  fdcId: number;
  description: string;
  brandName?: string;
  dataType?: string;
}>;

export type UsdaPortionOption = Readonly<{
  label: string;
  grams: number;
}>;

/** Macros + energy normalized per 100 g (or per 100 ml treated as g for beverages). */
export type UsdaPer100g = Readonly<{
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}>;

export type UsdaFoodParsed = Readonly<{
  fdcId: number;
  description: string;
  brandOwner?: string;
  dataType: string;
  per100g: UsdaPer100g;
  portionOptions: UsdaPortionOption[];
}>;

type FoodNutrientRow = Readonly<{
  amount?: number;
  nutrient?: Readonly<{ name?: string; unitName?: string }>;
}>;

function nutrientAmount(rows: FoodNutrientRow[], match: (name: string, unit: string) => boolean): number {
  for (const row of rows) {
    const name = (row.nutrient?.name ?? '').toLowerCase();
    const unit = (row.nutrient?.unitName ?? '').toUpperCase();
    const amt = Number(row.amount);
    if (!Number.isFinite(amt)) {
      continue;
    }
    if (match(name, unit)) {
      return amt;
    }
  }
  return 0;
}

function extractMacrosForReferenceGrams(
  rows: FoodNutrientRow[],
  referenceGrams: number,
): UsdaPer100g {
  const ref = referenceGrams > 0 ? referenceGrams : 100;

  const energyKcal = nutrientAmount(
    rows,
    (n, u) => (n.includes('energy') && u === 'KCAL') || n.includes('kilocalorie'),
  );

  const protein = nutrientAmount(rows, (n, u) => n === 'protein' && u === 'G');
  const carbs = nutrientAmount(
    rows,
    (n, u) => n.includes('carbohydrate') && n.includes('difference') && u === 'G',
  );
  const fat = nutrientAmount(
    rows,
    (n, u) => (n.includes('total lipid') || n === 'fat') && u === 'G',
  );
  const fiber = nutrientAmount(rows, (n, u) => n.includes('fiber') && n.includes('dietary') && u === 'G');

  const scale = 100 / ref;
  return {
    kcal: energyKcal * scale,
    protein: protein * scale,
    carbs: carbs * scale,
    fat: fat * scale,
    fiber: fiber * scale,
  };
}

function resolveReferenceGrams(food: Record<string, unknown>): number {
  const unit = String(food.servingSizeUnit ?? '').toLowerCase();
  const size = Number(food.servingSize);
  if (Number.isFinite(size) && size > 0) {
    if (unit === 'g' || unit === 'grm') {
      return size;
    }
    if (unit === 'ml' || unit === 'ml ') {
      return size;
    }
  }
  return 100;
}

function buildPortionOptions(food: Record<string, unknown>): UsdaPortionOption[] {
  const out: UsdaPortionOption[] = [{ label: '100 g', grams: 100 }];

  const portions = food.foodPortions as ReadonlyArray<Record<string, unknown>> | undefined;
  if (Array.isArray(portions)) {
    for (const p of portions) {
      const gw = Number(p.gramWeight);
      if (!Number.isFinite(gw) || gw <= 0) {
        continue;
      }
      const mod = String(p.modifier ?? '').trim();
      const desc = String(p.portionDescription ?? '').trim();
      const mu = String((p.measureUnit as { name?: string } | undefined)?.name ?? '').trim();
      const label = [mod, desc, mu].filter(Boolean).join(' · ') || `${gw} g`;
      out.push({ label: label.length > 42 ? `${label.slice(0, 40)}…` : label, grams: gw });
    }
  }

  const ss = Number(food.servingSize);
  const su = String(food.servingSizeUnit ?? '').toLowerCase();
  if (Number.isFinite(ss) && ss > 0 && (su === 'g' || su === 'ml')) {
    const label =
      String(food.householdServingFullText ?? '').trim() ||
      `Serving (${ss}${su === 'ml' ? ' ml' : ' g'})`;
    if (!out.some((o) => Math.abs(o.grams - ss) < 0.01)) {
      out.push({ label: label.length > 48 ? `${label.slice(0, 46)}…` : label, grams: ss });
    }
  }

  // De-dupe similar gram weights
  const seen = new Set<string>();
  return out.filter((o) => {
    const k = o.grams.toFixed(1);
    if (seen.has(k)) {
      return false;
    }
    seen.add(k);
    return true;
  });
}

function estimateKcalFromMacros(p: UsdaPer100g): number {
  if (p.kcal > 0) {
    return p.kcal;
  }
  return 4 * p.protein + 4 * p.carbs + 9 * p.fat;
}

export function scaleUsdaToGrams(per100g: UsdaPer100g, gramsEaten: number): UsdaPer100g {
  const m = gramsEaten / 100;
  return {
    kcal: per100g.kcal * m,
    protein: per100g.protein * m,
    carbs: per100g.carbs * m,
    fat: per100g.fat * m,
    fiber: per100g.fiber * m,
  };
}

export async function searchUsdaFoods(query: string): Promise<
  | Readonly<{ ok: true; foods: UsdaSearchHit[] }>
  | Readonly<{ ok: false; error: string }>
> {
  const q = query.trim();
  if (q.length < 2) {
    return { ok: true, foods: [] };
  }
  let key: string;
  try {
    key = requireApiKey();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Missing API key' };
  }

  try {
    const url = `${FDC_BASE}/foods/search?api_key=${encodeURIComponent(key)}`;
    // Omit `dataType` so FDC returns every category (Foundation, SR Legacy, Branded,
    // Survey FNDDS, experimental, etc.). Larger pageSize yields more generic + branded hits.
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        query: q,
        pageSize: 50,
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: t || `USDA search failed (${res.status})` };
    }
    const data = (await res.json()) as { foods?: ReadonlyArray<Record<string, unknown>> };
    const foods: UsdaSearchHit[] = (data.foods ?? []).map((f) => ({
      fdcId: Number(f.fdcId),
      description: String(f.description ?? 'Food'),
      brandName: f.brandOwner ? String(f.brandOwner) : f.brandName ? String(f.brandName) : undefined,
      dataType: f.dataType ? String(f.dataType) : undefined,
    }));
    return { ok: true, foods };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export async function fetchUsdaFoodDetail(
  fdcId: number,
): Promise<Readonly<{ ok: true; food: UsdaFoodParsed }> | Readonly<{ ok: false; error: string }>> {
  let key: string;
  try {
    key = requireApiKey();
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Missing API key' };
  }

  try {
    const url = `${FDC_BASE}/food/${fdcId}?api_key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: t || `USDA food failed (${res.status})` };
    }
    const food = (await res.json()) as Record<string, unknown>;
    const rows = (food.foodNutrients ?? []) as FoodNutrientRow[];
    const refG = resolveReferenceGrams(food);
    let per100g = extractMacrosForReferenceGrams(rows, refG);
    per100g = { ...per100g, kcal: per100g.kcal > 0 ? per100g.kcal : estimateKcalFromMacros(per100g) };

    const label = food.labelNutrients as Record<string, { value?: number }> | undefined;
    if (label && typeof label === 'object') {
      const cal = Number(label.calories?.value);
      const carbRaw =
        label.carbohydrates?.value ?? (label as { carbohydrate?: { value?: number } }).carbohydrate?.value;
      if (Number.isFinite(cal) && cal > 0 && refG > 0) {
        per100g = {
          ...per100g,
          kcal: (cal / refG) * 100,
          protein: Number.isFinite(Number(label.protein?.value))
            ? ((Number(label.protein?.value) ?? 0) / refG) * 100
            : per100g.protein,
          carbs: Number.isFinite(Number(carbRaw)) ? ((Number(carbRaw) ?? 0) / refG) * 100 : per100g.carbs,
          fat: Number.isFinite(Number(label.fat?.value))
            ? ((Number(label.fat?.value) ?? 0) / refG) * 100
            : per100g.fat,
          fiber: Number.isFinite(Number(label.fiber?.value))
            ? ((Number(label.fiber?.value) ?? 0) / refG) * 100
            : per100g.fiber,
        };
      }
    }

    if (per100g.kcal <= 0 && per100g.protein <= 0 && per100g.carbs <= 0 && per100g.fat <= 0) {
      return { ok: false, error: 'No nutrition facts found for this item.' };
    }

    const portionOptions = buildPortionOptions(food);
    const description = String(food.description ?? 'Food');
    const brandOwner = food.brandOwner ? String(food.brandOwner) : undefined;
    const dataType = String(food.dataType ?? 'Unknown');

    return {
      ok: true,
      food: {
        fdcId,
        description,
        brandOwner,
        dataType,
        per100g,
        portionOptions,
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
