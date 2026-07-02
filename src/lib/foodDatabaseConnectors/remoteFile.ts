import type {
  FoodDatabaseImportFood,
  FoodDatabaseImportPayload,
  FoodDatabaseImportRecipe,
} from '@/lib/foodDatabase.types';
import { csvNumber, indexCsvHeader, parseCsv } from './parseCsv';
import type { FoodDatabaseConnectorResult } from './types';

function isImportPayload(data: unknown): data is FoodDatabaseImportPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as FoodDatabaseImportPayload;
  return Array.isArray(d.sections) || Array.isArray(d.foods) || Array.isArray(d.recipes);
}

function foodsFromSimpleCsv(text: string, defaultSection: string): FoodDatabaseImportFood[] {
  const rows = parseCsv(text);
  if (rows.length < 2) return [];

  const header = indexCsvHeader(rows[0]);
  const foods: FoodDatabaseImportFood[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const get = (key: string) => {
      const idx = header.get(key);
      return idx == null ? '' : row[idx]?.trim() ?? '';
    };

    const name = get('name') || get('Name') || get('food_name');
    if (!name) continue;

    const sectionName = get('sectionName') || get('section') || get('category') || defaultSection;
    foods.push({
      sectionName,
      name: name.toUpperCase(),
      per100: {
        calories: csvNumber(get('calories') || get('energy_kcal') || get('kcal')),
        proteins: csvNumber(get('proteins') || get('protein')),
        carbohydrates: csvNumber(get('carbohydrates') || get('carbs')),
        fats: csvNumber(get('fats') || get('fat')),
        fiber: csvNumber(get('fiber') || get('fibre')),
        vitA: csvNumber(get('vitA')),
        vitC: csvNumber(get('vitC')),
        sodium: csvNumber(get('sodium')),
        calcium: csvNumber(get('calcium')),
        iron: csvNumber(get('iron')),
      },
    });
  }

  return foods;
}

function ensureSectionsFromFoods(foods: FoodDatabaseImportFood[]) {
  const order = new Map<string, number>();
  const sections = [];
  for (const food of foods) {
    if (!order.has(food.sectionName)) {
      order.set(food.sectionName, order.size + 1);
      sections.push({ name: food.sectionName, displayOrder: order.size });
    }
  }
  return sections;
}

export async function fetchRemoteJsonOrCsvPayload(
  url: string,
  kind: 'foods' | 'recipes',
  defaultSection: string
): Promise<FoodDatabaseConnectorResult> {
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Remote file download failed (${res.status})`);
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (contentType.includes('json') || text.trim().startsWith('{') || text.trim().startsWith('[')) {
    const data = JSON.parse(text) as unknown;
    if (Array.isArray(data)) {
      if (kind === 'recipes') {
        const recipes = data as FoodDatabaseImportRecipe[];
        const sections = ensureSectionsFromFoods(
          recipes.map((r) => ({ sectionName: r.sectionName, name: r.name, per100: { calories: 0, proteins: 0, carbohydrates: 0, fats: 0 } }))
        );
        return { payload: { sections, recipes }, warnings: [] };
      }
      const foods = data as FoodDatabaseImportFood[];
      return {
        payload: { sections: ensureSectionsFromFoods(foods), foods },
        warnings: [],
      };
    }

    if (isImportPayload(data)) {
      return { payload: data, warnings: [] };
    }

    throw new Error('JSON file is not a valid food database import payload');
  }

  const foods = foodsFromSimpleCsv(text, defaultSection);
  if (foods.length === 0) {
    throw new Error('CSV file has no valid food rows (expected header: name, sectionName, calories, …)');
  }

  return {
    payload: { sections: ensureSectionsFromFoods(foods), foods },
    warnings: [],
  };
}
