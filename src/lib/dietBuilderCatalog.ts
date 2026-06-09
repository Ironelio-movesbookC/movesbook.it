import type { FoodCatalogItem } from '@/data/nutritionFoodCatalog';
import { FOOD_SECTIONS } from '@/data/nutritionFoodCatalog';
import { dbRowToNutrients } from '@/lib/foodDatabase.types';
import { resolveLocalizedLabel } from '@/lib/foodDatabaseTranslations';
import { normalizeToolsLanguage } from '@/utils/toolsProfileLanguage';
import type { NutrientTotals } from '@/utils/nutritionMealTotals';

export const ALL_FOODS_RECIPES_SECTION = 'all';

export function dietBuilderAllSectionsLabel(lang: string): string {
  const code = normalizeToolsLanguage(lang);
  const labels: Record<string, string> = {
    en: 'All foods and recipes',
    it: 'Tutti alimenti e ricette',
    fr: 'Tous aliments et recettes',
    de: 'Alle Lebensmittel und Rezepte',
    es: 'Todos los alimentos y recetas',
    pt: 'Todos os alimentos e receitas',
    ru: 'Все продукты и рецепты',
    hi: 'सभी खाद्य पदार्थ और व्यंजन',
    ja: 'すべての食品とレシピ',
    id: 'Semua makanan dan resep',
    zh: '所有食物和食谱',
    ar: 'جميع الأطعمة والوصفات',
  };
  return labels[code] || labels.en;
}

export function localizeCatalogItem(item: FoodCatalogItem, lang: string): FoodCatalogItem {
  const code = normalizeToolsLanguage(lang);
  const defaultName = item.nameDefault || item.name;
  const localized = resolveLocalizedLabel(defaultName, item.nameTranslations, code);
  return { ...item, name: localized, nameDefault: defaultName };
}

export function localizeCatalog(items: FoodCatalogItem[], lang: string): FoodCatalogItem[] {
  return items.map((item) => localizeCatalogItem(item, lang));
}

export function recipeTotalGrams(componentsJson: string): number {
  try {
    const components = JSON.parse(componentsJson) as { grams?: number }[];
    if (!Array.isArray(components)) return 0;
    return components.reduce((sum, c) => sum + (Number(c.grams) || 0), 0);
  } catch {
    return 0;
  }
}

/** Recipe DB totals are for the full recipe weight — convert to per 100 g for Diet Builder scaling. */
export function recipeTotalsToPer100(
  row: Record<string, unknown>,
  componentsJson: string
): NutrientTotals {
  const totals = dbRowToNutrients(row);
  const totalGrams = recipeTotalGrams(componentsJson);
  if (totalGrams <= 0) return totals;
  const factor = 100 / totalGrams;
  const out = { ...totals };
  (Object.keys(out) as (keyof NutrientTotals)[]).forEach((key) => {
    out[key] = (totals[key] || 0) * factor;
  });
  return out;
}

export function catalogItemSearchText(item: FoodCatalogItem): string {
  const parts = [item.name, item.nameDefault || '', item.sectionName || ''];
  if (item.nameTranslations) {
    try {
      const map = JSON.parse(item.nameTranslations) as Record<string, string>;
      parts.push(...Object.values(map));
    } catch {
      /* ignore */
    }
  }
  return parts.join(' ').toLowerCase();
}

export interface DietBuilderSectionOption {
  value: string;
  label: string;
}

export function buildSectionOptions(
  catalog: FoodCatalogItem[],
  lang: string,
  sectionMeta?: { name: string; nameTranslations?: string | null }[]
): DietBuilderSectionOption[] {
  const code = normalizeToolsLanguage(lang);
  const options: DietBuilderSectionOption[] = [
    { value: ALL_FOODS_RECIPES_SECTION, label: dietBuilderAllSectionsLabel(code) },
  ];

  if (sectionMeta && sectionMeta.length > 0) {
    for (const s of sectionMeta) {
      options.push({
        value: s.name,
        label: resolveLocalizedLabel(s.name, s.nameTranslations, code),
      });
    }
    return options;
  }

  const dbNames = Array.from(new Set(catalog.map((f) => f.sectionName).filter(Boolean))) as string[];
  if (dbNames.length > 0) {
    return [...options, ...dbNames.sort().map((n) => ({ value: n, label: n }))];
  }

  return [
    ...options,
    ...FOOD_SECTIONS.filter((s) => s.id !== 'all').map((s) => ({ value: s.id, label: s.label })),
  ];
}
