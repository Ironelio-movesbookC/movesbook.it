import { prisma } from '@/lib/prisma';
import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';

const STATE_ID = 'default';

export interface FoodDatabaseSourceState {
  activeSourceId: FoodDatabaseSourceId;
  lastLoadedAt: string | null;
  lastLoadSummary: string | null;
}

const DEFAULT_STATE: FoodDatabaseSourceState = {
  activeSourceId: 'movesbook_bundled',
  lastLoadedAt: null,
  lastLoadSummary: null,
};

export async function getFoodDatabaseSourceState(): Promise<FoodDatabaseSourceState> {
  try {
    const row = await prisma.foodDatabaseSourceState.findUnique({ where: { id: STATE_ID } });
    if (!row) return DEFAULT_STATE;
    return {
      activeSourceId: row.activeSourceId as FoodDatabaseSourceId,
      lastLoadedAt: row.lastLoadedAt?.toISOString() ?? null,
      lastLoadSummary: row.lastLoadSummary,
    };
  } catch {
    return DEFAULT_STATE;
  }
}

export async function setFoodDatabaseSourceState(
  patch: Partial<FoodDatabaseSourceState>
): Promise<FoodDatabaseSourceState> {
  const current = await getFoodDatabaseSourceState();
  const next: FoodDatabaseSourceState = {
    activeSourceId: patch.activeSourceId ?? current.activeSourceId,
    lastLoadedAt: patch.lastLoadedAt ?? current.lastLoadedAt,
    lastLoadSummary: patch.lastLoadSummary ?? current.lastLoadSummary,
  };

  try {
    await prisma.foodDatabaseSourceState.upsert({
      where: { id: STATE_ID },
      create: {
        id: STATE_ID,
        activeSourceId: next.activeSourceId,
        lastLoadedAt: next.lastLoadedAt ? new Date(next.lastLoadedAt) : null,
        lastLoadSummary: next.lastLoadSummary,
      },
      update: {
        activeSourceId: next.activeSourceId,
        lastLoadedAt: next.lastLoadedAt ? new Date(next.lastLoadedAt) : null,
        lastLoadSummary: next.lastLoadSummary,
      },
    });
  } catch {
    // Table may not exist yet — state still returned to caller
  }

  return next;
}
