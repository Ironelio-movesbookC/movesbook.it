import {
  amountToGrams,
  FoodCatalogItem,
  scaleNutrients,
} from '@/data/nutritionFoodCatalog';
import { NUTRIENT_DISPLAY_COLUMNS, NutrientTotals } from '@/utils/nutritionMealTotals';

function nutrientKeyToSector(key: keyof NutrientTotals): string {
  const map: Record<keyof NutrientTotals, string> = {
    calories: 'calories',
    proteins: 'proteins',
    carbohydrates: 'carbohydrates',
    fats: 'fats',
    fiber: 'fiber',
    vitA: 'vitamin a',
    vitC: 'vitamin c',
    vitB1: 'vitamin b1',
    vitB2: 'vitamin b2',
    vitB6: 'vitamin b6',
    vitB12: 'vitamin b12',
    potassium: 'potassium',
    sodium: 'sodium',
    iron: 'iron',
    magnesium: 'magnesium',
    calcium: 'calcium',
    zinc: 'zinc',
    omega3: 'omega3',
  };
  return map[key];
}

export type DietframeAmountUnit = 'g' | 'oz' | 'lb' | 'ml' | 'pc';

export interface DietframeFormValues {
  foodName: string;
  catalogItemId?: string | null;
  amount: number;
  unit: DietframeAmountUnit;
  notes?: string;
  isRecipe?: boolean;
}

export interface DietBuilderCartLine {
  id: string;
  catalogItem: FoodCatalogItem;
  name: string;
  amount: number;
  unit: DietframeAmountUnit;
  grams: number;
  nutrients: NutrientTotals;
  selected: boolean;
}

export function computeDietframeNutrients(
  catalogItem: FoodCatalogItem | null,
  amount: number,
  unit: DietframeAmountUnit
): NutrientTotals | null {
  if (!catalogItem || !amount) return null;
  const grams = amountToGrams(amount, unit);
  if (grams <= 0) return null;
  return scaleNutrients(catalogItem.per100, grams);
}

export function buildDietframeApiPayload(
  values: DietframeFormValues,
  options: {
    nutritionMealId: string;
    sectionId?: string;
    catalogItem?: FoodCatalogItem | null;
    nutrients?: NutrientTotals | null;
  }
) {
  const { nutritionMealId, sectionId = 'default' } = options;
  const foodName = values.foodName.trim();
  const amountLabel = `${values.amount}${values.unit === 'pc' ? '' : values.unit}`;
  const grams = amountToGrams(values.amount, values.unit);

  const nutrition_components =
    values.isRecipe || !options.nutrients
      ? []
      : NUTRIENT_DISPLAY_COLUMNS.filter(({ key }) => (options.nutrients![key] || 0) > 0).map(
          ({ key }, index) => ({
            repetitionNumber: index + 1,
            exercise: foodName,
            muscularSector: nutrientKeyToSector(key),
            reps: Math.round((options.nutrients![key] || 0) * 10) / 10,
            weight: amountLabel,
            notes: values.notes?.trim() || null,
          })
        );

  return {
    nutritionMealId,
    sport: 'FREE_MOVES',
    type: 'STANDARD' as const,
    description: foodName,
    notes: values.notes?.trim() || null,
    sectionId,
    manualMode: values.isRecipe || nutrition_components.length === 0,
    manualPriority: false,
    manualInputType: values.unit === 'oz' ? 'oz' : values.unit === 'lb' ? 'lb' : values.unit === 'ml' ? 'ml' : 'g',
    manualDistance: Math.round(grams) || values.amount,
    manualRepetitions: values.amount,
    repetitions: 1,
    nutrition_components,
  };
}

export function cartLineToPayload(line: DietBuilderCartLine, nutritionMealId: string) {
  return buildDietframeApiPayload(
    {
      foodName: line.name,
      catalogItemId: line.catalogItem.id,
      amount: line.amount,
      unit: line.unit,
    },
    {
      nutritionMealId,
      catalogItem: line.catalogItem,
      nutrients: line.nutrients,
    }
  );
}
