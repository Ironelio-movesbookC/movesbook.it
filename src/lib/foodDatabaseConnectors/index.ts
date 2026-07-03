import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';
import { FOOD_DATABASE_SOURCES } from '@/constants/foodDatabaseSources';
import type { FoodDatabaseImportPayload } from '@/lib/foodDatabase.types';
import { fetchFosavPayload } from './fosav';
import { fetchOpenFoodFactsPayload } from './openFoodFacts';
import { fetchItalyTable2Payload } from './italyTable2';
import {
  getMissingLocalNutritionFile,
  isLocalNutritionFileAvailable,
} from './localFileStatus';
import type { FoodDatabaseConnectorOptions, FoodDatabaseConnectorResult, FoodDatabaseSourceStatus } from './types';
import { fetchUsdaPayload } from './usda';

export async function fetchFoodDatabaseFromSource(
  sourceId: FoodDatabaseSourceId,
  options: FoodDatabaseConnectorOptions = {}
): Promise<FoodDatabaseConnectorResult> {
  const maxFoods = options.maxFoods ?? 10000;

  let result: FoodDatabaseConnectorResult;

  switch (sourceId) {
    case 'fosav':
      result = await fetchFosavPayload(maxFoods);
      break;
    case 'usda':
      result = await fetchUsdaPayload(maxFoods);
      break;
    case 'italy_tables_1':
      throw new Error(
        'Italy food composition table I is not bundled yet. Add the file under public/nutritions when available.'
      );
    case 'italy_tables_2':
      result = await fetchItalyTable2Payload(maxFoods);
      break;
    case 'open_food_facts':
      result = await fetchOpenFoodFactsPayload(maxFoods);
      break;
    case 'k_datasets_recipes':
      throw new Error(
        'K-Datasets recipes file is not bundled yet. Add the file under public/nutritions when available.'
      );
    default:
      throw new Error(`Unknown food database source: ${sourceId}`);
  }

  result.payload.replaceExisting = options.replaceExisting ?? false;
  result.payload.sourceId = sourceId;
  return result;
}

export function getFoodDatabaseSourceStatuses(): FoodDatabaseSourceStatus[] {
  return FOOD_DATABASE_SOURCES.map((source) => {
    const missingEnv =
      source.envKeys?.filter((key) => !process.env[key]?.trim()) ?? [];

    let configured = missingEnv.length === 0;

    if (source.id === 'fosav' || source.id === 'italy_tables_2') {
      configured = isLocalNutritionFileAvailable(source.id);
    } else if (source.id === 'italy_tables_1' || source.id === 'k_datasets_recipes') {
      configured = false;
    }

    const missingFile = getMissingLocalNutritionFile(source.id);

    return {
      id: source.id,
      configured,
      missingEnv:
        missingFile != null
          ? [`Missing file: ${missingFile}`]
          : missingEnv.length > 0
            ? missingEnv
            : undefined,
    };
  });
}

export function assertSourceConfigured(sourceId: FoodDatabaseSourceId): void {
  const status = getFoodDatabaseSourceStatuses().find((s) => s.id === sourceId);
  if (status && !status.configured) {
    const detail = status.missingEnv?.join(', ') ?? 'not configured';
    throw new Error(`Source "${sourceId}" is not configured. ${detail}`);
  }
}

export type { FoodDatabaseConnectorOptions, FoodDatabaseConnectorResult, FoodDatabaseImportPayload };
