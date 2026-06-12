import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import { ensureMissingFoodSections } from '@/lib/foodDatabaseImport';

export async function GET(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    await ensureMissingFoodSections();
    const sections = await prisma.foodDatabaseSection.findMany({
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: { select: { foods: true, recipes: true } },
      },
    });
    return NextResponse.json({ sections });
  } catch (e) {
    console.error('food-database sections GET:', e);
    return NextResponse.json({ error: 'Failed to load sections' }, { status: 500 });
  }
}
