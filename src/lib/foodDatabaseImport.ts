import { prisma } from '@/lib/prisma';
import bundledImport from '@/data/foodDatabaseImport.json';
import {
  FoodDatabaseImportPayload,
  nutrientsToDb,
} from '@/lib/foodDatabase.types';
import { serializeTranslations } from '@/lib/foodDatabaseTranslations';

/** Seed admin food DB from bundled JSON when tables are empty (dev-friendly). */
export async function ensureBundledFoodDatabaseSeeded(): Promise<boolean> {
  const [foodCount, recipeCount] = await Promise.all([
    prisma.foodDatabaseItem.count(),
    prisma.foodDatabaseRecipe.count(),
  ]);
  if (foodCount > 0 || recipeCount > 0) return false;

  await importFoodDatabase({
    ...(bundledImport as FoodDatabaseImportPayload),
    replaceExisting: false,
  });
  return true;
}

/** Add any sections from bundled JSON that are not yet in the database. */
export async function ensureMissingFoodSections(): Promise<number> {
  const payload = bundledImport as FoodDatabaseImportPayload;
  const existing = await prisma.foodDatabaseSection.findMany();
  const existingKeys = new Set(existing.map((s) => s.name.toLowerCase()));
  let created = 0;

  for (const sec of payload.sections || []) {
    const key = sec.name.toLowerCase();
    if (existingKeys.has(key)) continue;
    await prisma.foodDatabaseSection.create({
      data: {
        name: sec.name,
        legacyId: sec.legacyId ?? null,
        displayOrder: sec.displayOrder ?? 0,
      },
    });
    existingKeys.add(key);
    created++;
  }

  return created;
}

export interface FoodDatabaseImportResult {
  sectionsCreated: number;
  sectionsUpdated: number;
  foodsCreated: number;
  foodsUpdated: number;
  recipesCreated: number;
  recipesUpdated: number;
}

export async function importFoodDatabase(
  payload: FoodDatabaseImportPayload
): Promise<FoodDatabaseImportResult> {
  const result: FoodDatabaseImportResult = {
    sectionsCreated: 0,
    sectionsUpdated: 0,
    foodsCreated: 0,
    foodsUpdated: 0,
    recipesCreated: 0,
    recipesUpdated: 0,
  };

  if (payload.replaceExisting) {
    await prisma.foodDatabaseRecipe.deleteMany({});
    await prisma.foodDatabaseItem.deleteMany({});
    await prisma.foodDatabaseSection.deleteMany({});
  }

  const sectionByName = new Map<string, string>();
  const existingSections = await prisma.foodDatabaseSection.findMany();
  for (const s of existingSections) {
    sectionByName.set(s.name.toLowerCase(), s.id);
  }

  for (const sec of payload.sections || []) {
    const key = sec.name.toLowerCase();
    const existing = existingSections.find(
      (s) => s.name.toLowerCase() === key || (sec.legacyId && s.legacyId === sec.legacyId)
    );

    if (existing) {
      await prisma.foodDatabaseSection.update({
        where: { id: existing.id },
        data: {
          name: sec.name,
          legacyId: sec.legacyId ?? existing.legacyId,
          displayOrder: sec.displayOrder ?? existing.displayOrder,
        },
      });
      sectionByName.set(key, existing.id);
      result.sectionsUpdated++;
    } else {
      const created = await prisma.foodDatabaseSection.create({
        data: {
          name: sec.name,
          legacyId: sec.legacyId ?? null,
          displayOrder: sec.displayOrder ?? 0,
        },
      });
      sectionByName.set(key, created.id);
      result.sectionsCreated++;
    }
  }

  const foodByLegacyId = new Map<number, string>();

  for (const food of payload.foods || []) {
    const sectionId = sectionByName.get(food.sectionName.toLowerCase());
    if (!sectionId) continue;

    const nutrients = nutrientsToDb(food.per100);
    const existing = food.legacyId
      ? await prisma.foodDatabaseItem.findFirst({ where: { legacyId: food.legacyId } })
      : await prisma.foodDatabaseItem.findFirst({
          where: { sectionId, name: food.name },
        });

    const data = {
      sectionId,
      name: food.name,
      isLiquid: food.isLiquid ?? false,
      ...nutrients,
      ...(food.nameTranslations
        ? { nameTranslations: serializeTranslations(food.nameTranslations) }
        : {}),
    };

    if (existing) {
      const updated = await prisma.foodDatabaseItem.update({
        where: { id: existing.id },
        data: { ...data, legacyId: food.legacyId ?? existing.legacyId },
      });
      if (updated.legacyId != null) foodByLegacyId.set(updated.legacyId, updated.id);
      result.foodsUpdated++;
    } else {
      const created = await prisma.foodDatabaseItem.create({
        data: { ...data, legacyId: food.legacyId ?? null },
      });
      if (created.legacyId != null) foodByLegacyId.set(created.legacyId, created.id);
      result.foodsCreated++;
    }
  }

  for (const recipe of payload.recipes || []) {
    const sectionId = sectionByName.get(recipe.sectionName.toLowerCase());
    if (!sectionId) continue;

    const components = recipe.components.map((c) => ({
      ...c,
      foodItemId: c.foodLegacyId ? foodByLegacyId.get(c.foodLegacyId) ?? null : null,
    }));

    const totals = nutrientsToDb(
      recipe.totals || {
        calories: 0,
        proteins: 0,
        carbohydrates: 0,
        fats: 0,
      }
    );

    const existing = recipe.legacyId
      ? await prisma.foodDatabaseRecipe.findFirst({ where: { legacyId: recipe.legacyId } })
      : await prisma.foodDatabaseRecipe.findFirst({
          where: { sectionId, name: recipe.name },
        });

    const data = {
      sectionId,
      name: recipe.name,
      description: recipe.description ?? null,
      componentsJson: JSON.stringify(components),
      ...totals,
      ...(recipe.nameTranslations
        ? { nameTranslations: serializeTranslations(recipe.nameTranslations) }
        : {}),
      ...(recipe.preparationTranslations
        ? { preparationTranslations: serializeTranslations(recipe.preparationTranslations) }
        : {}),
    };

    if (existing) {
      await prisma.foodDatabaseRecipe.update({
        where: { id: existing.id },
        data: { ...data, legacyId: recipe.legacyId ?? existing.legacyId },
      });
      result.recipesUpdated++;
    } else {
      await prisma.foodDatabaseRecipe.create({
        data: { ...data, legacyId: recipe.legacyId ?? null },
      });
      result.recipesCreated++;
    }
  }

  return result;
}

export async function getNextFoodLegacyId(): Promise<number> {
  const max = await prisma.foodDatabaseItem.aggregate({ _max: { legacyId: true } });
  return (max._max.legacyId ?? 0) + 1;
}

/** Assign sequential legacy IDs to items that were created without one. */
export async function assignMissingFoodLegacyIds(): Promise<number> {
  const missing = await prisma.foodDatabaseItem.findMany({
    where: { legacyId: null },
    orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
    select: { id: true },
  });
  if (missing.length === 0) return 0;

  let nextId = await getNextFoodLegacyId();
  for (const row of missing) {
    await prisma.foodDatabaseItem.update({
      where: { id: row.id },
      data: { legacyId: nextId },
    });
    nextId += 1;
  }
  return missing.length;
}
