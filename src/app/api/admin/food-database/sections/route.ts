import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import { ensureMissingFoodSections } from '@/lib/foodDatabaseImport';
import { getFoodDatabaseSourceState } from '@/lib/foodDatabaseSourceState';
import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';

export async function GET(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    await ensureMissingFoodSections();
    const { searchParams } = new URL(request.url);
    const sourceParam = searchParams.get('sourceId');
    const state = await getFoodDatabaseSourceState();
    const sourceId = (sourceParam || state.activeSourceId) as FoodDatabaseSourceId;

    const sections = await prisma.foodDatabaseSection.findMany({
      where: { sourceId },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { foods: true, recipes: true } },
      },
    });
    return NextResponse.json({ sections, sourceId });
  } catch (e) {
    console.error('food-database sections GET:', e);
    return NextResponse.json({ error: 'Failed to load sections' }, { status: 500 });
  }
}
