import type {
  FoodDatabaseImportFood,
  FoodDatabaseImportPayload,
  FoodDatabaseImportSection,
  FoodDatabaseNutrients,
} from '@/lib/foodDatabase.types';
import { LOCAL_NUTRITION_DATA_FILES } from '@/constants/localNutritionFiles';
import type { FoodDatabaseConnectorResult } from './types';
import { excelNumber, readWorkbook, sheetRows } from './parseExcel';

const DEFAULT_SECTION = 'Food composition table II';

/** Each nutrient lives on its own sheet: row 3 = headers, data from row 4. */
const ITALY_TABLE_II_SHEETS: { sheet: string; field: keyof FoodDatabaseNutrients }[] = [
  { sheet: 'ENERGIA Kcal', field: 'calories' },
  { sheet: 'PROTEINE', field: 'proteins' },
  { sheet: 'LIPIDI', field: 'fats' },
  { sheet: 'CARBOIDRATI', field: 'carbohydrates' },
  { sheet: 'FIBRA TOTALE', field: 'fiber' },
];

type FoodBuilder = {
  name: string;
  per100: FoodDatabaseNutrients;
};

function emptyNutrients(): FoodDatabaseNutrients {
  return {
    calories: 0,
    proteins: 0,
    carbohydrates: 0,
    fats: 0,
    fiber: 0,
  };
}

function mergeNutrientSheet(
  foods: Map<string, FoodBuilder>,
  rows: unknown[][],
  field: keyof FoodDatabaseNutrients
): void {
  for (let i = 4; i < rows.length; i++) {
    const row = rows[i];
    const name = String(row[0] ?? '').trim();
    if (!name) continue;

    const value = excelNumber(row[1]);
    let entry = foods.get(name);
    if (!entry) {
      entry = { name, per100: emptyNutrients() };
      foods.set(name, entry);
    }
    entry.per100[field] = value;
  }
}

export async function fetchItalyTable2Payload(maxFoods = 10000): Promise<FoodDatabaseConnectorResult> {
  const warnings: string[] = [];
  const relativePath = LOCAL_NUTRITION_DATA_FILES.italy_tables_2!;
  const workbook = readWorkbook(relativePath);
  const foodsByName = new Map<string, FoodBuilder>();

  for (const { sheet, field } of ITALY_TABLE_II_SHEETS) {
    if (!workbook.SheetNames.includes(sheet)) {
      warnings.push(`Italy table II sheet "${sheet}" not found — skipped.`);
      continue;
    }
    mergeNutrientSheet(foodsByName, sheetRows(workbook, sheet), field);
  }

  const foods: FoodDatabaseImportFood[] = [];
  let legacyId = 1;

  for (const entry of Array.from(foodsByName.values())) {
    if (foods.length >= maxFoods) break;
    const hasData =
      entry.per100.calories > 0 ||
      entry.per100.proteins > 0 ||
      entry.per100.carbohydrates > 0 ||
      entry.per100.fats > 0 ||
      (entry.per100.fiber ?? 0) > 0;
    if (!hasData) continue;

    foods.push({
      legacyId: legacyId++,
      sectionName: DEFAULT_SECTION,
      name: entry.name.toUpperCase(),
      per100: entry.per100,
      nameTranslations: { it: entry.name },
    });
  }

  if (foods.length === 0) {
    throw new Error('Italy food composition table II file contains no food rows');
  }

  foods.sort((a, b) => a.name.localeCompare(b.name, 'it'));

  if (foods.length >= maxFoods) {
    warnings.push(`Italy table II import capped at ${maxFoods} foods.`);
  }

  const sections: FoodDatabaseImportSection[] = [
    { name: DEFAULT_SECTION, displayOrder: 1 },
  ];

  return { payload: { sections, foods }, warnings };
}
