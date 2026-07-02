import type { FoodCatalogItem } from '@/data/nutritionFoodCatalog';
import { EMPTY_NUTRIENT_TOTALS } from '@/utils/nutritionMealTotals';

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
  const cleaned = tag.replace(/^en:/, '').replace(/-/g, ' ').trim();
  return cleaned ? cleaned.replace(/\b\w/g, (c) => c.toUpperCase()) : 'Open Food Facts';
}

function toCatalogItem(product: OffProduct): FoodCatalogItem | null {
  const name = product.product_name?.trim();
  if (!name) return null;
  const nutriments = product.nutriments as Record<string, unknown> | undefined;
  const code = product.code || name;

  return {
    id: `off:${code}`,
    name: name.toUpperCase(),
    nameDefault: name,
    group: 'carbohydrates',
    section: 'all',
    sectionName: sectionFromOff(product),
    kind: 'food',
    per100: {
      ...EMPTY_NUTRIENT_TOTALS,
      calories: offNum(nutriments, 'energy-kcal_100g'),
      proteins: offNum(nutriments, 'proteins_100g'),
      carbohydrates: offNum(nutriments, 'carbohydrates_100g'),
      fats: offNum(nutriments, 'fat_100g'),
      fiber: offNum(nutriments, 'fiber_100g'),
      sodium: offNum(nutriments, 'sodium_100g'),
    },
  };
}

export async function searchOpenFoodFactsLive(
  query: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ items: FoodCatalogItem[]; total?: number }> {
  const pageSize = options.pageSize ?? 25;
  const page = options.page ?? 1;

  const url = new URL('https://world.openfoodfacts.org/cgi/search.pl');
  url.searchParams.set('search_terms', query);
  url.searchParams.set('search_simple', '1');
  url.searchParams.set('action', 'process');
  url.searchParams.set('json', '1');
  url.searchParams.set('page', String(page));
  url.searchParams.set('page_size', String(pageSize));
  url.searchParams.set(
    'fields',
    'code,product_name,categories_tags_en,nutriments,energy-kcal_100g,proteins_100g,carbohydrates_100g,fat_100g,fiber_100g,sodium_100g'
  );

  const res = await fetch(url.toString(), {
    headers: { 'User-Agent': 'Movesbook-Nutrition/1.0' },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Open Food Facts search failed (${res.status})`);
  }

  const data = (await res.json()) as {
    products?: OffProduct[];
    count?: number;
  };

  const items = (data.products || [])
    .map(toCatalogItem)
    .filter((item): item is FoodCatalogItem => item != null);

  return { items, total: data.count };
}
