import { dbRowToNutrients } from '@/lib/foodDatabase.types';
import { scaleNutrients } from '@/data/nutritionFoodCatalog';
import {
  EMPTY_NUTRIENT_TOTALS,
  NutrientTotals,
  sumNutrientTotals,
} from '@/utils/nutritionMealTotals';
import type { DietBuilderGridRow } from '@/components/nutrition/modals/DietBuilderNutrientGrid';

export interface RecipeComponentInput {
  name: string;
  grams: number;
  foodItemId?: string | null;
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
  return [...byName.values()].find((f) => f.name.trim().toUpperCase() === key);
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
    const nutrients = scaleNutrients(per100, component.grams) as NutrientTotals;

    return {
      id: `${idx}-${component.name}`,
      name: component.name,
      grams: Number(component.grams) || 0,
      nutrients,
    };
  });

  const total = sumNutrientTotals(rows.map((r) => r.nutrients));
  return { rows, total };
}
