import type {
  FoodDatabaseImportFood,
  FoodDatabaseImportPayload,
  FoodDatabaseImportSection,
} from '@/lib/foodDatabase.types';
import type { FoodDatabaseConnectorResult } from './types';

const OFF_SEARCH = 'https://world.openfoodfacts.org/api/v2/search';

interface OffProduct {
  code?: string;
  product_name?: string;
  categories_tags_en?: string[];
  nutriments?: Record<string, number | string | undefined>;
}

function offNum(nutriments: Record<string, unknown> | undefined, key: string): number {
  const v = nutriments?.[key];
  const n = typeof v === 'number' ? v : Number.parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : 0;
}

function sectionFromOff(product: OffProduct): string {
  const tag = product.categories_tags_en?.[0] || '';
  const cleaned = tag
    .replace(/^en:/, '')
    .replace(/-/g, ' ')
    .trim();
  return cleaned ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Open Food Facts';
}

export async function fetchOpenFoodFactsPayload(maxFoods = 500): Promise<FoodDatabaseConnectorResult> {
  const warnings: string[] = [];
  const pageSize = 100;
  const foods: FoodDatabaseImportFood[] = [];
  const sectionOrder = new Map<string, number>();
  const sections: FoodDatabaseImportSection[] = [];

  let page = 1;
  while (foods.length < maxFoods) {
    const url = new URL(OFF_SEARCH);
    url.searchParams.set('page', String(page));
    url.searchParams.set('page_size', String(pageSize));
    url.searchParams.set(
      'fields',
      'code,product_name,categories_tags_en,nutriments,energy-kcal_100g,proteins_100g,carbohydrates_100g,fat_100g,fiber_100g,sodium_100g'
    );

    const res = await fetch(url.toString(), {
      headers: { 'User-Agent': 'Movesbook-Nutrition/1.0 (admin food database import)' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Open Food Facts API error ${res.status}`);
    }

    const data = (await res.json()) as {
      products?: OffProduct[];
      page_count?: number;
      count?: number;
    };

    const batch = data.products || [];
    if (batch.length === 0) break;

    for (const product of batch) {
      if (foods.length >= maxFoods) break;
      const name = product.product_name?.trim();
      if (!name) continue;

      const sectionName = sectionFromOff(product);
      if (!sectionOrder.has(sectionName)) {
        sectionOrder.set(sectionName, sectionOrder.size + 1);
        sections.push({ name: sectionName, displayOrder: sectionOrder.size });
      }

      const nutriments = product.nutriments as Record<string, unknown> | undefined;
      const legacyId = Number.parseInt(String(product.code || ''), 10);

      foods.push({
        legacyId: Number.isFinite(legacyId) ? legacyId : undefined,
        sectionName,
        name: name.toUpperCase(),
        per100: {
          calories: offNum(nutriments, 'energy-kcal_100g'),
          proteins: offNum(nutriments, 'proteins_100g'),
          carbohydrates: offNum(nutriments, 'carbohydrates_100g'),
          fats: offNum(nutriments, 'fat_100g'),
          fiber: offNum(nutriments, 'fiber_100g'),
          sodium: offNum(nutriments, 'sodium_100g'),
        },
      });
    }

    if (page >= (data.page_count || 1)) break;
    page++;
  }

  if (foods.length >= maxFoods) {
    warnings.push(`Open Food Facts import capped at ${maxFoods} products.`);
  }

  return { payload: { sections, foods }, warnings };
}
