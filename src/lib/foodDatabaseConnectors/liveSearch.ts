import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';
import type { FoodCatalogItem } from '@/data/nutritionFoodCatalog';
import { searchOpenFoodFactsLive } from '@/lib/foodDatabaseConnectors/openFoodFactsLive';
import { searchUsdaLive } from '@/lib/foodDatabaseConnectors/usdaLive';

export async function searchLiveFoodDatabase(
  sourceId: FoodDatabaseSourceId,
  query: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<{ items: FoodCatalogItem[]; total?: number }> {
  const q = query.trim();
  if (!q) return { items: [] };

  switch (sourceId) {
    case 'usda':
      return searchUsdaLive(q, options);
    case 'open_food_facts':
      return searchOpenFoodFactsLive(q, options);
    default:
      throw new Error(`Source "${sourceId}" does not support live search`);
  }
}
