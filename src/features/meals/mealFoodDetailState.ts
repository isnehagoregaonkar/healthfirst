import { scaleUsdaToGrams, type UsdaFoodParsed, type UsdaPer100g, type UsdaPortionOption } from '../../services/usdaFdc';
import {
  foodValuePortionOptions,
  foodValueToPer100g,
  type FoodValueEntry,
} from './foodValuesCatalog';

export type MealFoodDetailState =
  | Readonly<{ kind: 'usda'; food: UsdaFoodParsed }>
  | Readonly<{ kind: 'local'; entry: FoodValueEntry }>;

export type ScaledMealNutrition = Readonly<{
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  grams: number;
  servings: number;
  portionLabel: string;
}>;

export function mealDetailPer100g(d: MealFoodDetailState): UsdaPer100g {
  return d.kind === 'usda' ? d.food.per100g : foodValueToPer100g(d.entry);
}

export function mealDetailPortionOptions(d: MealFoodDetailState): UsdaPortionOption[] {
  return d.kind === 'usda' ? d.food.portionOptions : foodValuePortionOptions(d.entry);
}

export function computeScaledFromDetail(
  detail: MealFoodDetailState,
  portionIndex: number,
  servingsText: string,
): ScaledMealNutrition | null {
  const opts = mealDetailPortionOptions(detail);
  if (opts.length === 0) {
    return null;
  }
  const per100g = mealDetailPer100g(detail);
  const p = opts[Math.min(portionIndex, opts.length - 1)] ?? opts[0];
  const sv = Number.parseFloat(servingsText.replace(',', '.'));
  const servings = Number.isFinite(sv) && sv > 0 ? sv : 1;
  const grams = p.grams * servings;
  const scaled = scaleUsdaToGrams(per100g, grams);
  return {
    kcal: scaled.kcal,
    protein: scaled.protein,
    carbs: scaled.carbs,
    fat: scaled.fat,
    fiber: scaled.fiber,
    grams,
    servings,
    portionLabel: p.label,
  };
}
