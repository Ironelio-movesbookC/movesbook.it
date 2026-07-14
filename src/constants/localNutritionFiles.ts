import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';

/** Bundled nutrition spreadsheets under public/nutritions (server-side import). */
export const LOCAL_NUTRITION_DATA_FILES: Partial<Record<FoodDatabaseSourceId, string>> = {
  fosav: 'public/nutritions/1-swiss.xlsx',
  italy_tables_2: 'public/nutritions/4-Food-composition-table-2.xlsm',
};

export function getLocalNutritionFilePath(sourceId: FoodDatabaseSourceId): string | undefined {
  return LOCAL_NUTRITION_DATA_FILES[sourceId];
}
