import type {
  FoodDatabaseImportFood,
  FoodDatabaseImportPayload,
  FoodDatabaseImportSection,
} from '@/lib/foodDatabase.types';
import type { FoodDatabaseConnectorResult } from './types';

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

interface UsdaNutrient {
  nutrientName?: string;
  unitName?: string;
  value?: number;
}

interface UsdaFood {
  fdcId: number;
  description?: string;
  foodCategory?: string;
  foodNutrients?: UsdaNutrient[];
}

function nutrientValue(nutrients: UsdaNutrient[] | undefined, names: string[]): number {
  if (!nutrients) return 0;
  for (const name of names) {
    const hit = nutrients.find((n) => n.nutrientName?.toLowerCase() === name.toLowerCase());
    if (hit?.value != null && Number.isFinite(hit.value)) return hit.value;
  }
  return 0;
}

function mapUsdaFood(food: UsdaFood, sectionName: string): FoodDatabaseImportFood {
  const nutrients = food.foodNutrients;
  return {
    legacyId: food.fdcId,
    sectionName,
    name: (food.description || `FDC ${food.fdcId}`).toUpperCase(),
    per100: {
      calories: nutrientValue(nutrients, ['Energy', 'Energy (Atwater General Factors)', 'Energy (Atwater Specific Factors)']),
      proteins: nutrientValue(nutrients, ['Protein']),
      carbohydrates: nutrientValue(nutrients, ['Carbohydrate, by difference']),
      fats: nutrientValue(nutrients, ['Total lipid (fat)']),
      fiber: nutrientValue(nutrients, ['Fiber, total dietary']),
      vitA: nutrientValue(nutrients, ['Vitamin A, RAE']),
      vitC: nutrientValue(nutrients, ['Vitamin C, total ascorbic acid']),
      vitB1: nutrientValue(nutrients, ['Thiamin']),
      vitB2: nutrientValue(nutrients, ['Riboflavin']),
      vitB6: nutrientValue(nutrients, ['Vitamin B-6']),
      vitB12: nutrientValue(nutrients, ['Vitamin B-12']),
      sodium: nutrientValue(nutrients, ['Sodium, Na']),
      potassium: nutrientValue(nutrients, ['Potassium, K']),
      calcium: nutrientValue(nutrients, ['Calcium, Ca']),
      magnesium: nutrientValue(nutrients, ['Magnesium, Mg']),
      iron: nutrientValue(nutrients, ['Iron, Fe']),
      zinc: nutrientValue(nutrients, ['Zinc, Zn']),
    },
  };
}

export async function fetchUsdaPayload(maxFoods = 1000): Promise<FoodDatabaseConnectorResult> {
  const apiKey = process.env.USDA_FDC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('USDA_FDC_API_KEY is not configured. Sign up at fdc.nal.usda.gov/api-key-signup');
  }

  const warnings: string[] = [];
  const pageSize = 200;
  const foods: FoodDatabaseImportFood[] = [];
  const sectionOrder = new Map<string, number>();
  const sections: FoodDatabaseImportSection[] = [];

  let pageNumber = 1;
  while (foods.length < maxFoods) {
    const url = new URL(`${USDA_BASE}/foods/list`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('pageSize', String(pageSize));
    url.searchParams.set('pageNumber', String(pageNumber));
    url.searchParams.set('dataType', 'Foundation,SR Legacy');

    const res = await fetch(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`USDA API error ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as { foods?: UsdaFood[]; totalPages?: number };
    const batch = data.foods || [];
    if (batch.length === 0) break;

    for (const food of batch) {
      if (foods.length >= maxFoods) break;
      const sectionName = (food.foodCategory || 'USDA Foods').trim();
      if (!sectionOrder.has(sectionName)) {
        sectionOrder.set(sectionName, sectionOrder.size + 1);
        sections.push({ name: sectionName, displayOrder: sectionOrder.size });
      }
      foods.push(mapUsdaFood(food, sectionName));
    }

    if (pageNumber >= (data.totalPages || 1)) break;
    pageNumber++;
  }

  if (foods.length >= maxFoods) {
    warnings.push(`USDA import capped at ${maxFoods} foods.`);
  }

  return { payload: { sections, foods }, warnings };
}
