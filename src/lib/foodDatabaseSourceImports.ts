import { prisma } from '@/lib/prisma';
import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';

export interface SourceImportStatus {
  sourceId: FoodDatabaseSourceId;
  imported: boolean;
  importedAt: string | null;
  foodCount: number;
  recipeCount: number;
  summary: string | null;
}

export async function recordSourceImport(
  sourceId: string,
  foodCount: number,
  recipeCount: number,
  summary: string
): Promise<void> {
  try {
    await prisma.foodDatabaseSourceImport.upsert({
      where: { sourceId },
      create: { sourceId, foodCount, recipeCount, summary, importedAt: new Date() },
      update: { foodCount, recipeCount, summary, importedAt: new Date() },
    });
  } catch {
    // table may not exist yet
  }
}

export async function getSourceImportStatuses(): Promise<SourceImportStatus[]> {
  try {
    const rows = await prisma.foodDatabaseSourceImport.findMany();
    return rows.map((row) => ({
      sourceId: row.sourceId as FoodDatabaseSourceId,
      imported: row.foodCount > 0 || row.recipeCount > 0,
      importedAt: row.importedAt.toISOString(),
      foodCount: row.foodCount,
      recipeCount: row.recipeCount,
      summary: row.summary,
    }));
  } catch {
    return [];
  }
}

export async function getSourceImportStatus(sourceId: string): Promise<SourceImportStatus | null> {
  try {
    const row = await prisma.foodDatabaseSourceImport.findUnique({ where: { sourceId } });
    if (!row) return null;
    return {
      sourceId: row.sourceId as FoodDatabaseSourceId,
      imported: row.foodCount > 0 || row.recipeCount > 0,
      importedAt: row.importedAt.toISOString(),
      foodCount: row.foodCount,
      recipeCount: row.recipeCount,
      summary: row.summary,
    };
  } catch {
    return null;
  }
}

export async function countFoodsForSource(sourceId: string): Promise<number> {
  try {
    return prisma.foodDatabaseItem.count({ where: { sourceId, isActive: true } });
  } catch {
    return 0;
  }
}

export async function countRecipesForSource(sourceId: string): Promise<number> {
  try {
    return prisma.foodDatabaseRecipe.count({ where: { sourceId, isActive: true } });
  } catch {
    return 0;
  }
}
