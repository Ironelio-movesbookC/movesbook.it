import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';
import type { FoodDatabaseImportPayload } from '@/lib/foodDatabase.types';

export interface FoodDatabaseConnectorOptions {
  replaceExisting?: boolean;
  /** Cap items fetched from large remote catalogs (default varies per connector). */
  maxFoods?: number;
  maxRecipes?: number;
}

export interface FoodDatabaseConnectorResult {
  payload: FoodDatabaseImportPayload;
  warnings: string[];
}

export type FoodDatabaseConnector = (
  options: FoodDatabaseConnectorOptions
) => Promise<FoodDatabaseConnectorResult>;

export interface FoodDatabaseSourceStatus {
  id: FoodDatabaseSourceId;
  configured: boolean;
  missingEnv?: string[];
}
