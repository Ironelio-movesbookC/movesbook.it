import { NutrientTotals } from '@/utils/nutritionMealTotals';

export interface FoodDatabaseNutrients {
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
  fiber?: number;
  vitA?: number;
  vitC?: number;
  vitB1?: number;
  vitB2?: number;
  vitB6?: number;
  vitB12?: number;
  potassium?: number;
  sodium?: number;
  iron?: number;
  magnesium?: number;
  calcium?: number;
  zinc?: number;
  omega3?: number;
}

export interface FoodDatabaseImportSection {
  legacyId?: number;
  name: string;
  displayOrder?: number;
}

export interface FoodDatabaseImportFood {
  legacyId?: number;
  sectionName: string;
  name: string;
  isLiquid?: boolean;
  per100: FoodDatabaseNutrients;
  nameTranslations?: Record<string, string>;
}

export interface FoodDatabaseImportRecipeComponent {
  name: string;
  grams: number;
  foodLegacyId?: number;
}

export interface FoodDatabaseImportRecipe {
  legacyId?: number;
  sectionName: string;
  name: string;
  description?: string;
  nameTranslations?: Record<string, string>;
  preparationTranslations?: Record<string, string>;
  components: FoodDatabaseImportRecipeComponent[];
  totals?: FoodDatabaseNutrients;
}

export interface FoodDatabaseImportPayload {
  sections?: FoodDatabaseImportSection[];
  foods?: FoodDatabaseImportFood[];
  recipes?: FoodDatabaseImportRecipe[];
  replaceExisting?: boolean;
  /** Tag imported rows so multiple catalogs can coexist locally. */
  sourceId?: string;
}

export function nutrientsToDb(data: FoodDatabaseNutrients) {
  return {
    calories: data.calories ?? 0,
    proteins: data.proteins ?? 0,
    carbohydrates: data.carbohydrates ?? 0,
    fats: data.fats ?? 0,
    fiber: data.fiber ?? 0,
    vitA: data.vitA ?? 0,
    vitC: data.vitC ?? 0,
    vitB1: data.vitB1 ?? 0,
    vitB2: data.vitB2 ?? 0,
    vitB6: data.vitB6 ?? 0,
    vitB12: data.vitB12 ?? 0,
    potassium: data.potassium ?? 0,
    sodium: data.sodium ?? 0,
    iron: data.iron ?? 0,
    magnesium: data.magnesium ?? 0,
    calcium: data.calcium ?? 0,
    zinc: data.zinc ?? 0,
    omega3: data.omega3 ?? 0,
  };
}

export function dbRowToNutrients(row: Record<string, unknown>): NutrientTotals {
  return {
    calories: Number(row.calories) || 0,
    proteins: Number(row.proteins) || 0,
    carbohydrates: Number(row.carbohydrates) || 0,
    fats: Number(row.fats) || 0,
    fiber: Number(row.fiber) || 0,
    vitA: Number(row.vitA) || 0,
    vitC: Number(row.vitC) || 0,
    vitB1: Number(row.vitB1) || 0,
    vitB2: Number(row.vitB2) || 0,
    vitB6: Number(row.vitB6) || 0,
    vitB12: Number(row.vitB12) || 0,
    potassium: Number(row.potassium) || 0,
    sodium: Number(row.sodium) || 0,
    iron: Number(row.iron) || 0,
    magnesium: Number(row.magnesium) || 0,
    calcium: Number(row.calcium) || 0,
    zinc: Number(row.zinc) || 0,
    omega3: Number(row.omega3) || 0,
  };
}

export function sectionNameToSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Normalize stored food image paths for browser display. */
export function resolveFoodImageUrl(url: string | null | undefined): string | null {
  if (!url?.trim()) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:')) {
    return trimmed;
  }

  const apiPrefix = '/api/admin/food-database/uploads/';
  if (trimmed.startsWith(apiPrefix)) return trimmed;

  const staticPrefix = '/uploads/food-database/';
  if (trimmed.startsWith(staticPrefix)) {
    return `${apiPrefix}${trimmed.slice(staticPrefix.length)}`;
  }

  if (trimmed.startsWith('/')) return trimmed;
  return `/${trimmed.replace(/^\/+/, '')}`;
}
