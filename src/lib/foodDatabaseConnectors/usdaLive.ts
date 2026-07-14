import type { FoodCatalogItem } from '@/data/nutritionFoodCatalog';
import { EMPTY_NUTRIENT_TOTALS } from '@/utils/nutritionMealTotals';

const USDA_BASE = 'https://api.nal.usda.gov/fdc/v1';

interface UsdaNutrient {
  nutrientName?: string;
  value?: number;
}

interface UsdaSearchFood {
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

function toCatalogItem(food: UsdaSearchFood): FoodCatalogItem {
  const nutrients = food.foodNutrients;
  const sectionName = food.foodCategory || 'USDA Foods';
  return {
    id: `usda:${food.fdcId}`,
    name: (food.description || `FDC ${food.fdcId}`).toUpperCase(),
    nameDefault: food.description || '',
    group: 'carbohydrates',
    section: 'all',
    sectionName,
    kind: 'food',
    per100: {
      ...EMPTY_NUTRIENT_TOTALS,
      calories: nutrientValue(nutrients, ['Energy', 'Energy (Atwater General Factors)']),
      proteins: nutrientValue(nutrients, ['Protein']),
      carbohydrates: nutrientValue(nutrients, ['Carbohydrate, by difference']),
      fats: nutrientValue(nutrients, ['Total lipid (fat)']),
      fiber: nutrientValue(nutrients, ['Fiber, total dietary']),
      vitA: nutrientValue(nutrients, ['Vitamin A, RAE']),
      vitC: nutrientValue(nutrients, ['Vitamin C, total ascorbic acid']),
      sodium: nutrientValue(nutrients, ['Sodium, Na']),
      potassium: nutrientValue(nutrients, ['Potassium, K']),
      calcium: nutrientValue(nutrients, ['Calcium, Ca']),
      iron: nutrientValue(nutrients, ['Iron, Fe']),
    },
  };
}

export async function searchUsdaLive(
  query: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ items: FoodCatalogItem[]; total?: number }> {
  const apiKey = process.env.USDA_FDC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('USDA_FDC_API_KEY is not configured');
  }

  const pageSize = options.pageSize ?? 25;
  const pageNumber = options.page ?? 1;

  const url = new URL(`${USDA_BASE}/foods/search`);
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('query', query);
  url.searchParams.set('pageSize', String(pageSize));
  url.searchParams.set('pageNumber', String(pageNumber));
  url.searchParams.set('dataType', 'Foundation,SR Legacy,Survey (FNDDS)');

  const res = await fetch(url.toString(), { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`USDA search failed (${res.status})`);
  }

  const data = (await res.json()) as {
    foods?: UsdaSearchFood[];
    totalHits?: number;
  };

  return {
    items: (data.foods || []).map(toCatalogItem),
    total: data.totalHits,
  };
}
