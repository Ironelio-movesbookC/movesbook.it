import { dbRowToNutrients } from '@/lib/foodDatabase.types';
import { FoodCatalogItem, scaleNutrients } from '@/data/nutritionFoodCatalog';
import {
  EMPTY_NUTRIENT_TOTALS,
  NutrientTotals,
  sumNutrientTotals,
} from '@/utils/nutritionMealTotals';
import type { DietBuilderGridRow } from '@/components/nutrition/modals/DietBuilderNutrientGrid';
import { DietBuilderCartLine } from '@/utils/dietframePayload';

export interface RecipeComponentInput {
  name: string;
  grams: number;
  foodItemId?: string | null;
}

export function cartLinesToComponents(lines: DietBuilderCartLine[]): RecipeComponentInput[] {
  return lines.map((line) => ({
    name: line.name,
    grams: line.grams,
    foodItemId: line.catalogItem.id,
  }));
}

export function componentsToCartLines(
  components: RecipeComponentInput[],
  catalog: FoodCatalogItem[]
): DietBuilderCartLine[] {
  const foods = catalog.filter((item) => item.kind !== 'recipe');
  const byId = new Map(foods.map((f) => [f.id, f]));
  const byName = new Map(foods.map((f) => [f.name.trim().toUpperCase(), f]));

  const lines: DietBuilderCartLine[] = [];

  components.forEach((component, idx) => {
    let food: FoodCatalogItem | undefined;
    if (component.foodItemId) food = byId.get(component.foodItemId);
    if (!food) food = byName.get(component.name.trim().toUpperCase());

    const grams = Number(component.grams) || 0;
    if (!food) {
      if (!component.name.trim() || grams <= 0) return;
      lines.push({
        id: `line-${idx}-${component.name}`,
        catalogItem: {
          id: component.foodItemId || `legacy-${idx}`,
          name: component.name,
          group: 'carbohydrates',
          section: 'all',
          per100: { ...EMPTY_NUTRIENT_TOTALS },
          kind: 'food',
        },
        name: component.name,
        amount: grams,
        unit: 'g',
        grams,
        nutrients: { ...EMPTY_NUTRIENT_TOTALS },
        selected: false,
      });
      return;
    }

    const nutrients = scaleNutrients(food.per100, grams) as NutrientTotals;
    lines.push({
      id: `line-${idx}-${food.id}`,
      catalogItem: food,
      name: food.name,
      amount: grams,
      unit: 'g',
      grams,
      nutrients,
      selected: false,
    });
  });

  return lines;
}

export function recipeNutrientsFromCart(lines: DietBuilderCartLine[]): NutrientTotals {
  return sumNutrientTotals(lines.map((line) => line.nutrients));
}

export interface FoodItemNutrientSource {
  id: string;
  name: string;
  [key: string]: unknown;
}

function findFoodForComponent(
  component: RecipeComponentInput,
  byId: Map<string, FoodItemNutrientSource>,
  byName: Map<string, FoodItemNutrientSource>
): FoodItemNutrientSource | undefined {
  if (component.foodItemId) {
    const byItemId = byId.get(component.foodItemId);
    if (byItemId) return byItemId;
  }
  const key = component.name.trim().toUpperCase();
  if (byName.has(key)) return byName.get(key);
  return Array.from(byName.values()).find((f) => f.name.trim().toUpperCase() === key);
}

export function cartLinesToGridRows(lines: DietBuilderCartLine[]): DietBuilderGridRow[] {
  return lines.map((line) => ({
    id: line.id,
    name: line.name,
    grams: line.grams,
    nutrients: line.nutrients,
  }));
}

/** Build ingredient grid rows using the food catalog (same logic as recipe editor). */
export function buildRecipeIngredientGridFromCatalog(
  components: RecipeComponentInput[],
  catalog: FoodCatalogItem[]
): { rows: DietBuilderGridRow[]; total: NutrientTotals } {
  const lines = componentsToCartLines(components, catalog);
  return {
    rows: cartLinesToGridRows(lines),
    total: recipeNutrientsFromCart(lines),
  };
}

export function buildRecipeIngredientGrid(
  components: RecipeComponentInput[],
  foodItems: FoodItemNutrientSource[]
): { rows: DietBuilderGridRow[]; total: NutrientTotals } {
  const byId = new Map(foodItems.map((f) => [f.id, f]));
  const byName = new Map(foodItems.map((f) => [f.name.trim().toUpperCase(), f]));

  const rows: DietBuilderGridRow[] = components.map((component, idx) => {
    const food = findFoodForComponent(component, byId, byName);
    const per100 = food ? dbRowToNutrients(food) : { ...EMPTY_NUTRIENT_TOTALS };
    const grams = Number(component.grams) || 0;
    const nutrients = scaleNutrients(per100, grams) as NutrientTotals;
    const displayName =
      (food?.name as string | undefined)?.trim() ||
      component.name?.trim() ||
      '—';

    return {
      id: `${idx}-${component.foodItemId || displayName}`,
      name: displayName,
      grams,
      nutrients,
    };
  });

  const total = sumNutrientTotals(rows.map((r) => r.nutrients));
  return { rows, total };
}
