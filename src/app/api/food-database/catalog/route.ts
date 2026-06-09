import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureBundledFoodDatabaseSeeded } from '@/lib/foodDatabaseImport';
import { dbRowToNutrients } from '@/lib/foodDatabase.types';
import { recipeTotalsToPer100 } from '@/lib/dietBuilderCatalog';
import { normalizeToolsLanguage } from '@/utils/toolsProfileLanguage';
import type { FoodCatalogItem, FoodGroupId, FoodSectionId } from '@/data/nutritionFoodCatalog';

function mapSectionToCatalogId(sectionName: string): FoodSectionId {
  const n = sectionName.toLowerCase();
  if (n.includes('appetizer')) return 'all';
  if (n.includes('milk')) return 'milk';
  if (n.includes('cereal')) return 'cereals';
  if (n.includes('meat') || n.includes('fish')) return 'meat_fish';
  if (n.includes('vegetable')) return 'vegetables';
  if (n.includes('fruit')) return 'fruits';
  if (n.includes('oil') || n.includes('sweet')) return 'oils_sweets';
  return 'all';
}

function mapSectionToGroup(sectionName: string): FoodGroupId {
  const n = sectionName.toLowerCase();
  if (n.includes('milk') || n.includes('meat') || n.includes('fish')) return 'proteins_dairy';
  if (n.includes('cereal')) return 'carbohydrates';
  if (n.includes('vegetable') || n.includes('fruit')) return 'fruits_vegetables';
  if (n.includes('oil') || n.includes('sweet')) return 'fats_sweets';
  return 'carbohydrates';
}

/** Public read-only catalog for Diet Builder (foods + recipes; falls back to empty if DB not migrated). */
export async function GET(request: NextRequest) {
  const langParam = request.nextUrl.searchParams.get('lang');
  const language = normalizeToolsLanguage(langParam || 'en');

  try {
    await ensureBundledFoodDatabaseSeeded();

    const [items, recipes, sections] = await Promise.all([
      prisma.foodDatabaseItem.findMany({
        where: { isActive: true },
        include: { section: { select: { name: true, nameTranslations: true } } },
        orderBy: [{ section: { displayOrder: 'asc' } }, { name: 'asc' }],
      }),
      prisma.foodDatabaseRecipe.findMany({
        where: { isActive: true },
        include: { section: { select: { name: true, nameTranslations: true } } },
        orderBy: [{ section: { displayOrder: 'asc' } }, { name: 'asc' }],
      }),
      prisma.foodDatabaseSection.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: 'asc' },
        select: { name: true, nameTranslations: true },
      }),
    ]);

    const foodEntries: FoodCatalogItem[] = items.map((item) => ({
      id: item.id,
      name: item.name,
      nameDefault: item.name,
      nameTranslations: item.nameTranslations,
      group: mapSectionToGroup(item.section.name),
      section: mapSectionToCatalogId(item.section.name),
      sectionName: item.section.name,
      isLiquid: item.isLiquid,
      kind: 'food',
      per100: dbRowToNutrients(item as unknown as Record<string, unknown>),
    }));

    const recipeEntries: FoodCatalogItem[] = recipes.map((recipe) => ({
      id: `recipe:${recipe.id}`,
      name: recipe.name,
      nameDefault: recipe.name,
      nameTranslations: recipe.nameTranslations,
      group: mapSectionToGroup(recipe.section.name),
      section: mapSectionToCatalogId(recipe.section.name),
      sectionName: recipe.section.name,
      kind: 'recipe',
      per100: recipeTotalsToPer100(
        recipe as unknown as Record<string, unknown>,
        recipe.componentsJson
      ),
    }));

    const catalog = [...foodEntries, ...recipeEntries];

    return NextResponse.json({
      catalog,
      sections: sections.map((s) => ({
        name: s.name,
        nameTranslations: s.nameTranslations,
      })),
      language,
      source: 'database',
    });
  } catch (e) {
    console.error('food-database catalog GET:', e);
    return NextResponse.json({ catalog: [], sections: [], language, source: 'empty' });
  }
}
