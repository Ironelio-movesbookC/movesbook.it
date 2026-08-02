import { NextRequest, NextResponse } from 'next/server';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import {
  FOOD_DATABASE_SOURCES,
  FOOD_DATABASE_DISPLAY_MENU,
  getFoodDatabaseSource,
  getFoodDatabaseSourceLabel,
  isImportFoodDatabaseSource,
  type FoodDatabaseSourceId,
} from '@/constants/foodDatabaseSources';
import bundledImport from '@/data/foodDatabaseImport.json';
import type { FoodDatabaseImportPayload } from '@/lib/foodDatabase.types';
import {
  assertSourceConfigured,
  fetchFoodDatabaseFromSource,
  getFoodDatabaseSourceStatuses,
} from '@/lib/foodDatabaseConnectors';
import { importFoodDatabase } from '@/lib/foodDatabaseImport';
import { getFoodDatabaseSourceState, setFoodDatabaseSourceState } from '@/lib/foodDatabaseSourceState';
import {
  countFoodsForSource,
  countRecipesForSource,
  getSourceImportStatuses,
  recordSourceImport,
} from '@/lib/foodDatabaseSourceImports';

export async function GET(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  const statuses = getFoodDatabaseSourceStatuses();
  const state = await getFoodDatabaseSourceState();
  const importStatuses = await getSourceImportStatuses();

  const sources = await Promise.all(
    FOOD_DATABASE_SOURCES.map(async (source) => {
      const status = statuses.find((s) => s.id === source.id);
      const recorded = importStatuses.find((i) => i.sourceId === source.id);
      const foodCount = await countFoodsForSource(source.id);
      const recipeCount = await countRecipesForSource(source.id);
      const hasData = foodCount > 0 || recipeCount > 0;

      return {
        ...source,
        configured: status?.configured ?? true,
        missingEnv: status?.missingEnv,
        importStatus: {
          imported: hasData || recorded?.imported || false,
          importedAt: recorded?.importedAt ?? null,
          foodCount: hasData ? foodCount : (recorded?.foodCount ?? 0),
          recipeCount: hasData ? recipeCount : (recorded?.recipeCount ?? 0),
          summary: recorded?.summary ?? null,
        },
      };
    })
  );

  return NextResponse.json({
    sources,
    menuSources: FOOD_DATABASE_DISPLAY_MENU,
    activeSourceId: state.activeSourceId,
    activeSource: getFoodDatabaseSource(state.activeSourceId),
    activeSourceLabel: getFoodDatabaseSourceLabel(state.activeSourceId),
    lastLoadedAt: state.lastLoadedAt,
    lastLoadSummary: state.lastLoadSummary,
  });
}

/** Import an import-mode database into local storage (Food & Recipes Settings). */
export async function POST(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const sourceId = body.sourceId as FoodDatabaseSourceId | undefined;
    const replaceExisting = Boolean(body.replaceExisting);

    if (!sourceId || !FOOD_DATABASE_SOURCES.some((s) => s.id === sourceId)) {
      return NextResponse.json({ error: 'Invalid sourceId' }, { status: 400 });
    }

    if (!isImportFoodDatabaseSource(sourceId)) {
      return NextResponse.json(
        { error: 'This database is read live when selected — import is not required.' },
        { status: 400 }
      );
    }

    assertSourceConfigured(sourceId);

    let payload: FoodDatabaseImportPayload;
    let warnings: string[] = [];

    if (sourceId === 'movesbook_bundled') {
      payload = {
        ...(bundledImport as FoodDatabaseImportPayload),
        sourceId,
        replaceExisting,
      };
    } else {
      const fetched = await fetchFoodDatabaseFromSource(sourceId, { replaceExisting });
      payload = fetched.payload;
      warnings = fetched.warnings;
    }

    const result = await importFoodDatabase(payload);

    const foodCount = await countFoodsForSource(sourceId);
    const recipeCount = await countRecipesForSource(sourceId);
    const summary = `Imported ${getFoodDatabaseSourceLabel(sourceId)}: ${foodCount} foods, ${recipeCount} recipes.`;
    await recordSourceImport(sourceId, foodCount, recipeCount, summary);

    await setFoodDatabaseSourceState({
      activeSourceId: sourceId,
      lastLoadSummary: summary,
      lastLoadedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: summary,
      result,
      warnings,
      sourceId,
      foodCount,
      recipeCount,
      activeSourceId: sourceId,
      activeSource: getFoodDatabaseSource(sourceId),
      activeSourceLabel: getFoodDatabaseSourceLabel(sourceId),
    });
  } catch (e) {
    console.error('food-database sources POST:', e);
    return NextResponse.json(
      { error: 'Import failed', details: (e as Error).message },
      { status: 500 }
    );
  }
}

/** Select active database from the menu (import = local data, live = remote API). */
export async function PUT(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json().catch(() => ({}));
    const sourceId = body.sourceId as FoodDatabaseSourceId | undefined;

    if (!sourceId || !FOOD_DATABASE_SOURCES.some((s) => s.id === sourceId)) {
      return NextResponse.json({ error: 'Invalid sourceId' }, { status: 400 });
    }

    const source = getFoodDatabaseSource(sourceId);
    if (source?.accessMode === 'import') {
      const foodCount = await countFoodsForSource(sourceId);
      const recipeCount = await countRecipesForSource(sourceId);
      if (foodCount === 0 && recipeCount === 0 && sourceId !== 'movesbook_bundled') {
        return NextResponse.json(
          {
            error: 'Database not imported yet',
            details: 'Open Food & Recipes Settings and use Import for this database first.',
            needsImport: true,
          },
          { status: 409 }
        );
      }
    } else {
      assertSourceConfigured(sourceId);
    }

    const state = await setFoodDatabaseSourceState({
      activeSourceId: sourceId,
      lastLoadSummary: `Active: ${getFoodDatabaseSourceLabel(sourceId)}`,
    });

    return NextResponse.json({
      success: true,
      activeSourceId: state.activeSourceId,
      activeSource: getFoodDatabaseSource(state.activeSourceId),
      activeSourceLabel: getFoodDatabaseSourceLabel(state.activeSourceId),
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'Select failed', details: (e as Error).message },
      { status: 500 }
    );
  }
}
