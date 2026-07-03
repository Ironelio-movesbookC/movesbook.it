/**
 * Food catalog for the Diet Builder (section B).
 * per100 values are per 100 g or 100 ml. Micronutrients are illustrative until DB is wired.
 */

import { NutrientTotals } from '@/utils/nutritionMealTotals';

export type FoodGroupId =
  | 'carbohydrates'
  | 'fats_sweets'
  | 'proteins_dairy'
  | 'fruits_vegetables';

export type FoodSectionId =
  | 'all'
  | 'milk'
  | 'cereals'
  | 'meat_fish'
  | 'vegetables'
  | 'fruits'
  | 'oils_sweets'
  | 'sweets'
  | 'drinks';

export const FOOD_SECTIONS: { id: FoodSectionId; label: string }[] = [
  { id: 'all', label: 'All sections' },
  { id: 'milk', label: 'Milk' },
  { id: 'cereals', label: 'Cereals' },
  { id: 'meat_fish', label: 'Meat & Fish' },
  { id: 'vegetables', label: 'Vegetables' },
  { id: 'fruits', label: 'Fruits' },
  { id: 'oils_sweets', label: 'Oils & Sweets' },
  { id: 'sweets', label: 'Sweets' },
  { id: 'drinks', label: 'Drinks' },
];

export type FoodCatalogNutrients = NutrientTotals;

export interface FoodCatalogItem {
  id: string;
  name: string;
  group: FoodGroupId;
  section: FoodSectionId;
  /** Admin DB section label (e.g. Appetizers) when loaded from database */
  sectionName?: string;
  isLiquid?: boolean;
  per100: FoodCatalogNutrients;
  /** food (default) or recipe from admin database */
  kind?: 'food' | 'recipe';
  /** Raw English name — used for search fallback */
  nameDefault?: string;
  /** JSON string of translations when loaded from API */
  nameTranslations?: string | null;
}

export const FOOD_GROUP_META: Record<
  FoodGroupId,
  { label: string; emoji: string; bg: string; ring: string }
> = {
  carbohydrates: { label: 'Carbohydrates', emoji: '🌾', bg: 'bg-sky-500', ring: 'ring-sky-300' },
  fats_sweets: { label: 'Fats and sweets', emoji: '🍩', bg: 'bg-pink-500', ring: 'ring-pink-300' },
  proteins_dairy: { label: 'Proteins and dairy', emoji: '🥩', bg: 'bg-amber-400', ring: 'ring-amber-200' },
  fruits_vegetables: { label: 'Fruits and vegetables', emoji: '🥦', bg: 'bg-emerald-500', ring: 'ring-emerald-300' },
};

function n(
  partial: Partial<FoodCatalogNutrients> & Pick<FoodCatalogNutrients, 'calories' | 'proteins' | 'carbohydrates' | 'fats'>
): FoodCatalogNutrients {
  return {
    calories: partial.calories,
    proteins: partial.proteins,
    carbohydrates: partial.carbohydrates,
    fats: partial.fats,
    fiber: partial.fiber ?? 0,
    vitA: partial.vitA ?? 0,
    vitC: partial.vitC ?? 0,
    vitB1: partial.vitB1 ?? 0,
    vitB2: partial.vitB2 ?? 0,
    vitB6: partial.vitB6 ?? 0,
    vitB12: partial.vitB12 ?? 0,
    potassium: partial.potassium ?? 0,
    sodium: partial.sodium ?? 0,
    iron: partial.iron ?? 0,
    magnesium: partial.magnesium ?? 0,
    calcium: partial.calcium ?? 0,
    zinc: partial.zinc ?? 0,
    omega3: partial.omega3 ?? 0,
  };
}

export const FOOD_CATALOG: FoodCatalogItem[] = [
  { id: 'oats', name: 'OATS', group: 'carbohydrates', section: 'cereals', per100: n({ calories: 389, proteins: 17, carbohydrates: 66, fats: 7, fiber: 10, iron: 4.7, magnesium: 177, zinc: 4 }) },
  { id: 'barley-flour', name: 'BARLEY FLOUR', group: 'carbohydrates', section: 'cereals', per100: n({ calories: 360, proteins: 10, carbohydrates: 78, fats: 2, fiber: 15, iron: 3.6, magnesium: 133 }) },
  { id: 'rice-white', name: 'RICE WHITE (cooked)', group: 'carbohydrates', section: 'cereals', per100: n({ calories: 130, proteins: 2.7, carbohydrates: 28, fats: 0.3, fiber: 0.4 }) },
  { id: 'pasta', name: 'PASTA (cooked)', group: 'carbohydrates', section: 'cereals', per100: n({ calories: 157, proteins: 5.8, carbohydrates: 31, fats: 0.9, fiber: 1.8 }) },
  { id: 'bread', name: 'BREAD whole wheat', group: 'carbohydrates', section: 'cereals', per100: n({ calories: 247, proteins: 13, carbohydrates: 41, fats: 3.4, fiber: 7, iron: 2.5, magnesium: 82 }) },
  { id: 'soya-milk', name: 'SOYA MILK', group: 'proteins_dairy', section: 'milk', isLiquid: true, per100: n({ calories: 32, proteins: 3, carbohydrates: 1.8, fats: 1.8, fiber: 0.4, calcium: 120, vitB12: 0.4 }) },
  { id: 'milk', name: 'MILK semi-skimmed', group: 'proteins_dairy', section: 'milk', isLiquid: true, per100: n({ calories: 46, proteins: 3.3, carbohydrates: 4.8, fats: 1.6, calcium: 120, vitB12: 0.4, potassium: 150 }) },
  { id: 'greek-yogurt', name: 'GREEK YOGURT', group: 'proteins_dairy', section: 'milk', per100: n({ calories: 97, proteins: 9, carbohydrates: 3.6, fats: 5, calcium: 110, potassium: 141 }) },
  { id: 'olive-oil', name: 'OLIVE OIL', group: 'fats_sweets', section: 'oils_sweets', per100: n({ calories: 884, proteins: 0, carbohydrates: 0, fats: 100, vitA: 0 }) },
  { id: 'butter', name: 'BUTTER', group: 'fats_sweets', section: 'oils_sweets', per100: n({ calories: 717, proteins: 0.9, carbohydrates: 0.1, fats: 81, vitA: 684 }) },
  { id: 'chocolate', name: 'DARK CHOCOLATE', group: 'fats_sweets', section: 'oils_sweets', per100: n({ calories: 546, proteins: 4.9, carbohydrates: 61, fats: 31, fiber: 7, iron: 8, magnesium: 146 }) },
  { id: 'chicken-breast', name: 'CHICKEN BREAST', group: 'proteins_dairy', section: 'meat_fish', per100: n({ calories: 165, proteins: 31, carbohydrates: 0, fats: 3.6, iron: 1, potassium: 256, vitB6: 0.5 }) },
  { id: 'salmon', name: 'SALMON', group: 'proteins_dairy', section: 'meat_fish', per100: n({ calories: 208, proteins: 20, carbohydrates: 0, fats: 13, omega3: 2.5, potassium: 363, vitB12: 3.2 }) },
  { id: 'eggs', name: 'EGGS whole', group: 'proteins_dairy', section: 'meat_fish', per100: n({ calories: 155, proteins: 13, carbohydrates: 1.1, fats: 11, vitA: 160, iron: 1.8, vitB12: 1.1 }) },
  { id: 'banana', name: 'BANANA', group: 'fruits_vegetables', section: 'fruits', per100: n({ calories: 89, proteins: 1.1, carbohydrates: 23, fats: 0.3, fiber: 2.6, potassium: 358, vitC: 8.7, vitB6: 0.4 }) },
  { id: 'apple', name: 'APPLE', group: 'fruits_vegetables', section: 'fruits', per100: n({ calories: 52, proteins: 0.3, carbohydrates: 14, fats: 0.2, fiber: 2.4, vitC: 4.6, potassium: 107 }) },
  { id: 'broccoli', name: 'BROCCOLI', group: 'fruits_vegetables', section: 'vegetables', per100: n({ calories: 34, proteins: 2.8, carbohydrates: 7, fats: 0.4, fiber: 2.6, vitC: 89, vitA: 31, calcium: 47, iron: 0.7 }) },
  { id: 'spinach', name: 'SPINACH', group: 'fruits_vegetables', section: 'vegetables', per100: n({ calories: 23, proteins: 2.9, carbohydrates: 3.6, fats: 0.4, fiber: 2.2, vitA: 469, vitC: 28, iron: 2.7, calcium: 99, magnesium: 79 }) },
  { id: 'tomato', name: 'TOMATO', group: 'fruits_vegetables', section: 'vegetables', per100: n({ calories: 18, proteins: 0.9, carbohydrates: 3.9, fats: 0.2, fiber: 1.2, vitC: 14, potassium: 237, vitA: 42 }) },
];

export function amountToGrams(amount: number, unit: 'g' | 'oz' | 'lb' | 'ml' | 'pc'): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  switch (unit) {
    case 'oz':
      return amount * 28.3495;
    case 'lb':
      return amount * 453.592;
    default:
      return amount;
  }
}

export function scaleNutrients(per100: FoodCatalogNutrients, amountGrams: number): FoodCatalogNutrients {
  const factor = amountGrams / 100;
  const out = { ...per100 };
  (Object.keys(out) as (keyof FoodCatalogNutrients)[]).forEach((key) => {
    out[key] = (per100[key] || 0) * factor;
  });
  return out;
}
