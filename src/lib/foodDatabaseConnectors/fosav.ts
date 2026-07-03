import type {
  FoodDatabaseImportFood,
  FoodDatabaseImportPayload,
  FoodDatabaseImportSection,
} from '@/lib/foodDatabase.types';
import { LOCAL_NUTRITION_DATA_FILES } from '@/constants/localNutritionFiles';
import type { FoodDatabaseConnectorResult } from './types';
import { cellString, excelNumber, readWorkbook, sheetRows } from './parseExcel';

/** Swiss DB V7 — column indices on header row (row index 2). */
const SWISS_COL = {
  id: 0,
  name: 3,
  category: 5,
  calories: 11,
  fats: 14,
  carbohydrates: 41,
  fiber: 50,
  proteins: 53,
  vitA: 68,
  vitB1: 80,
  vitB2: 83,
  vitB6: 86,
  vitB12: 89,
  vitC: 101,
  potassium: 110,
  sodium: 113,
  calcium: 119,
  magnesium: 122,
  iron: 128,
  zinc: 134,
  omega3: 29,
} as const;

const SWISS_FOOD_SHEETS = ['Alimenti generici', 'Prodotti di marca'] as const;

function sectionFromCategory(category: string): string {
  const parts = category.split('/').map((p) => p.trim()).filter(Boolean);
  const leaf = parts[parts.length - 1] || category || 'General';
  return leaf.replace(/\b\w/g, (c) => c.toUpperCase());
}

function mapSwissRow(row: unknown[]): FoodDatabaseImportFood | null {
  const name = cellString(row, SWISS_COL.name);
  if (!name) return null;

  const category = cellString(row, SWISS_COL.category) || 'General';
  const sectionName = sectionFromCategory(category);
  const legacyId = excelNumber(row[SWISS_COL.id]);

  return {
    legacyId: legacyId > 0 ? legacyId : undefined,
    sectionName,
    name: name.toUpperCase(),
    per100: {
      calories: excelNumber(row[SWISS_COL.calories]),
      proteins: excelNumber(row[SWISS_COL.proteins]),
      carbohydrates: excelNumber(row[SWISS_COL.carbohydrates]),
      fats: excelNumber(row[SWISS_COL.fats]),
      fiber: excelNumber(row[SWISS_COL.fiber]),
      vitA: excelNumber(row[SWISS_COL.vitA]),
      vitC: excelNumber(row[SWISS_COL.vitC]),
      vitB1: excelNumber(row[SWISS_COL.vitB1]),
      vitB2: excelNumber(row[SWISS_COL.vitB2]),
      vitB6: excelNumber(row[SWISS_COL.vitB6]),
      vitB12: excelNumber(row[SWISS_COL.vitB12]),
      sodium: excelNumber(row[SWISS_COL.sodium]),
      potassium: excelNumber(row[SWISS_COL.potassium]),
      calcium: excelNumber(row[SWISS_COL.calcium]),
      magnesium: excelNumber(row[SWISS_COL.magnesium]),
      iron: excelNumber(row[SWISS_COL.iron]),
      zinc: excelNumber(row[SWISS_COL.zinc]),
      omega3: excelNumber(row[SWISS_COL.omega3]),
    },
    nameTranslations: { it: name },
  };
}

function parseSwissSheet(rows: unknown[][]): FoodDatabaseImportFood[] {
  const foods: FoodDatabaseImportFood[] = [];
  for (let i = 3; i < rows.length; i++) {
    const food = mapSwissRow(rows[i]);
    if (food) foods.push(food);
  }
  return foods;
}

export async function fetchFosavPayload(maxFoods = 10000): Promise<FoodDatabaseConnectorResult> {
  const warnings: string[] = [];
  const relativePath = LOCAL_NUTRITION_DATA_FILES.fosav!;
  const workbook = readWorkbook(relativePath);

  const sectionOrder = new Map<string, number>();
  const sections: FoodDatabaseImportSection[] = [];
  const foods: FoodDatabaseImportFood[] = [];

  for (const sheetName of SWISS_FOOD_SHEETS) {
    if (!workbook.SheetNames.includes(sheetName)) {
      warnings.push(`Swiss sheet "${sheetName}" not found — skipped.`);
      continue;
    }
    const rows = sheetRows(workbook, sheetName);
    for (const food of parseSwissSheet(rows)) {
      if (foods.length >= maxFoods) break;
      if (!sectionOrder.has(food.sectionName)) {
        sectionOrder.set(food.sectionName, sectionOrder.size + 1);
        sections.push({ name: food.sectionName, displayOrder: sectionOrder.size });
      }
      foods.push(food);
    }
    if (foods.length >= maxFoods) break;
  }

  if (foods.length === 0) {
    throw new Error('Swiss nutrition file contains no food rows');
  }

  if (foods.length >= maxFoods) {
    warnings.push(`Swiss import capped at ${maxFoods} foods.`);
  }

  const payload: FoodDatabaseImportPayload = { sections, foods };
  return { payload, warnings };
}
