/**
 * Nutrition meal totals — aggregate components into day / meal summaries.
 */

import { UI_CONFIG } from '@/config/nutrition.constants';

export const MEAL_SLOT_COUNT = UI_CONFIG.MAX_MEALS_PER_DAY;

export const MEAL_LABELS: Record<number, string> = {
  1: 'Breakfast',
  2: 'Lunch',
  3: 'Breakfast 2',
  4: 'Dinner',
};

export const MEAL_SYMBOLS: Record<number, { symbol: string; label: string }> = {
  1: { symbol: '○', label: 'Circle' },
  2: { symbol: '□', label: 'Square' },
  3: { symbol: '△', label: 'Triangle' },
  4: { symbol: '▽', label: 'Inverted triangle' },
};

/** Meal header colors (match day-table column groups). */
export const MEAL_HEADER_COLORS: Record<number, { bg: string; sub: string }> = {
  1: { bg: 'bg-green-300', sub: 'bg-green-200' },
  2: { bg: 'bg-orange-300', sub: 'bg-orange-200' },
  3: { bg: 'bg-blue-300', sub: 'bg-blue-200' },
  4: { bg: 'bg-pink-300', sub: 'bg-pink-200' },
};

export interface NutrientTotals {
  calories: number;
  proteins: number;
  carbohydrates: number;
  fats: number;
  fiber: number;
  vitA: number;
  vitC: number;
  vitB1: number;
  vitB2: number;
  vitB6: number;
  vitB12: number;
  potassium: number;
  sodium: number;
  iron: number;
  magnesium: number;
  calcium: number;
  zinc: number;
  omega3: number;
}

export interface MealFoodLine {
  id: string;
  name: string;
  amount: string;
  unit: 'g' | 'oz' | 'lb' | 'ml' | 'pc';
}

export const EMPTY_NUTRIENT_TOTALS: NutrientTotals = {
  calories: 0,
  proteins: 0,
  carbohydrates: 0,
  fats: 0,
  fiber: 0,
  vitA: 0,
  vitC: 0,
  vitB1: 0,
  vitB2: 0,
  vitB6: 0,
  vitB12: 0,
  potassium: 0,
  sodium: 0,
  iron: 0,
  magnesium: 0,
  calcium: 0,
  zinc: 0,
  omega3: 0,
};

export const NUTRIENT_DISPLAY_COLUMNS: { key: keyof NutrientTotals; label: string; short?: string }[] = [
  { key: 'calories', label: 'Calories', short: 'Cal' },
  { key: 'proteins', label: 'Proteins', short: 'Pro' },
  { key: 'carbohydrates', label: 'Carbohydrates', short: 'Carb' },
  { key: 'fats', label: 'Fats', short: 'Fats' },
  { key: 'fiber', label: 'Fiber' },
  { key: 'vitA', label: 'Vit A' },
  { key: 'vitC', label: 'Vit C' },
  { key: 'vitB1', label: 'Vit B1' },
  { key: 'vitB2', label: 'Vit B2' },
  { key: 'vitB6', label: 'Vit B6' },
  { key: 'vitB12', label: 'Vit B12' },
  { key: 'potassium', label: 'K' },
  { key: 'sodium', label: 'Na' },
  { key: 'iron', label: 'Fe' },
  { key: 'magnesium', label: 'Mg' },
  { key: 'calcium', label: 'Ca' },
  { key: 'zinc', label: 'Zn' },
  { key: 'omega3', label: 'n-3' },
];

/** Background colors for nutrient grid columns (Cal / macros / vitamins / minerals). */
export type NutrientColorGroup = 'default' | 'calories' | 'macros' | 'vitamins' | 'minerals';

export function getNutrientColorGroup(key: keyof NutrientTotals): NutrientColorGroup {
  switch (key) {
    case 'calories':
      return 'calories';
    case 'carbohydrates':
    case 'fats':
    case 'fiber':
      return 'macros';
    case 'vitA':
    case 'vitC':
    case 'vitB1':
    case 'vitB2':
    case 'vitB6':
    case 'vitB12':
      return 'vitamins';
    case 'potassium':
    case 'sodium':
    case 'iron':
    case 'magnesium':
    case 'calcium':
    case 'zinc':
    case 'omega3':
      return 'minerals';
    default:
      return 'default';
  }
}

export function getNutrientColumnBgClass(key: keyof NutrientTotals): string {
  switch (getNutrientColorGroup(key)) {
    case 'calories':
      return 'bg-yellow-300';
    case 'macros':
      return 'bg-yellow-100';
    case 'vitamins':
      return 'bg-green-200';
    case 'minerals':
      return 'bg-blue-200';
    default:
      return 'bg-white';
  }
}

function parseAmount(value: unknown): number {
  if (value == null || value === '') return 0;
  const n = parseFloat(String(value).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function bucketForComponent(component: any): keyof NutrientTotals | null {
  const sector = String(component.muscularSector || component.exercise || '').toLowerCase();
  if (sector.includes('protein') || sector.includes('pro')) return 'proteins';
  if (sector.includes('carb') || sector.includes('carboy')) return 'carbohydrates';
  if (sector.includes('fat') || sector.includes('lipid')) return 'fats';
  if (sector.includes('fiber') || sector.includes('fibre')) return 'fiber';
  if (sector.includes('vit a') || sector.includes('vitamin a')) return 'vitA';
  if (sector.includes('vit c') || sector.includes('vitamin c')) return 'vitC';
  if (sector.includes('b1') || sector.includes('thiamin')) return 'vitB1';
  if (sector.includes('b2') || sector.includes('riboflavin')) return 'vitB2';
  if (sector.includes('b6')) return 'vitB6';
  if (sector.includes('b12')) return 'vitB12';
  if (sector.includes('potassium') || sector === 'k') return 'potassium';
  if (sector.includes('sodium') || sector === 'na') return 'sodium';
  if (sector.includes('iron') || sector === 'fe') return 'iron';
  if (sector.includes('magnesium') || sector === 'mg') return 'magnesium';
  if (sector.includes('calcium') || sector === 'ca') return 'calcium';
  if (sector.includes('zinc') || sector === 'zn') return 'zinc';
  if (sector.includes('omega') || sector.includes('n-3') || sector.includes('n3')) return 'omega3';
  if (sector.includes('calorie') || sector.includes('kcal') || sector.includes('energy')) return 'calories';
  return null;
}

/** Meal is enabled when it exists and is not explicitly NOT_PLANNED without foods. */
export function isMealEnabled(meal: any | null | undefined): boolean {
  if (!meal) return false;
  if (meal.enabled === false) return false;
  if (meal.status === 'NOT_PLANNED' && !(meal.nutritionFoods?.length)) return false;
  return true;
}

export function computeMealNutrients(meal: any | null | undefined): NutrientTotals {
  const totals = { ...EMPTY_NUTRIENT_TOTALS };
  if (!meal || !isMealEnabled(meal)) return totals;

  if (meal.calories) {
    totals.calories += parseAmount(meal.calories);
  }

  for (const food of meal.nutritionFoods || []) {
    for (const component of food.nutritionComponents || []) {
      const amount = parseAmount(component.reps ?? component.weight ?? component.distance);
      const bucket = bucketForComponent(component);
      if (bucket) {
        totals[bucket] += amount;
      }
    }
  }

  if (!totals.calories && (totals.proteins || totals.carbohydrates || totals.fats)) {
    totals.calories =
      totals.proteins * 4 + totals.carbohydrates * 4 + totals.fats * 9;
  }

  return totals;
}

export function sumNutrientTotals(list: NutrientTotals[]): NutrientTotals {
  const out = { ...EMPTY_NUTRIENT_TOTALS };
  for (const t of list) {
    for (const col of NUTRIENT_DISPLAY_COLUMNS) {
      out[col.key] += t[col.key] || 0;
    }
  }
  return out;
}

export function getMealBySlot(day: any, slot: number): any | null {
  const meals = day?.meals || [];
  return meals.find((m: any) => m.sessionNumber === slot) || meals[slot - 1] || null;
}

export function computeDayNutritionSummary(day: any): {
  dayTotal: NutrientTotals;
  bySlot: Record<number, NutrientTotals>;
} {
  const bySlot: Record<number, NutrientTotals> = {};
  const enabledTotals: NutrientTotals[] = [];

  for (let slot = 1; slot <= MEAL_SLOT_COUNT; slot++) {
    const meal = getMealBySlot(day, slot);
    const nutrients = computeMealNutrients(meal);
    bySlot[slot] = nutrients;
    if (isMealEnabled(meal)) {
      enabledTotals.push(nutrients);
    }
  }

  return {
    dayTotal: sumNutrientTotals(enabledTotals),
    bySlot,
  };
}

export function extractMealFoodLines(meal: any | null | undefined): MealFoodLine[] {
  if (!meal || !isMealEnabled(meal)) return [];
  const lines: MealFoodLine[] = [];

  for (const food of meal.nutritionFoods || []) {
    const name =
      food.description?.replace(/<[^>]+>/g, '').trim() ||
      food.notes?.trim() ||
      `Food ${food.letter || ''}`.trim();

    let amount = '';
    let unit: MealFoodLine['unit'] = 'g';

    if (food.manualDistance) {
      amount = String(food.manualDistance);
      unit = food.manualInputType === 'oz' ? 'oz' : 'g';
    } else if (food.repetitions) {
      amount = String(food.repetitions);
      unit = 'g';
    } else {
      const firstComp = food.nutritionComponents?.[0];
      if (firstComp?.weight) {
        amount = String(firstComp.weight).replace(/[^\d.]/g, '') || String(firstComp.weight);
        const w = String(firstComp.weight).toLowerCase();
        if (w.includes('oz')) unit = 'oz';
        else if (w.includes('lb')) unit = 'lb';
        else if (w.includes('ml')) unit = 'ml';
      } else if (firstComp?.reps) {
        amount = String(firstComp.reps);
        unit = 'g';
      }
    }

    lines.push({
      id: food.id,
      name,
      amount: amount || '—',
      unit,
    });
  }

  return lines;
}

export function formatNutrient(value: number, key: keyof NutrientTotals): string {
  if (!value) return '—';
  if (key === 'calories') return value % 1 === 0 ? String(value) : value.toFixed(1);
  return value % 1 === 0 ? String(Math.round(value)) : value.toFixed(1);
}
