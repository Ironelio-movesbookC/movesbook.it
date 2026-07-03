import { existsSync } from 'fs';
import { join } from 'path';
import {
  getLocalNutritionFilePath,
  LOCAL_NUTRITION_DATA_FILES,
} from '@/constants/localNutritionFiles';
import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';

export function isLocalNutritionFileAvailable(sourceId: FoodDatabaseSourceId): boolean {
  const relative = getLocalNutritionFilePath(sourceId);
  if (!relative) return false;
  return existsSync(join(process.cwd(), relative));
}

export function getMissingLocalNutritionFile(sourceId: FoodDatabaseSourceId): string | undefined {
  if (!LOCAL_NUTRITION_DATA_FILES[sourceId]) return undefined;
  return isLocalNutritionFileAvailable(sourceId) ? undefined : LOCAL_NUTRITION_DATA_FILES[sourceId];
}
