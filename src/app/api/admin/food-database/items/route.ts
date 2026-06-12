import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import { nutrientsToDb } from '@/lib/foodDatabase.types';
import { getNextFoodLegacyId, assignMissingFoodLegacyIds } from '@/lib/foodDatabaseImport';
import { serializeTranslations } from '@/lib/foodDatabaseTranslations';

export async function GET(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    await assignMissingFoodLegacyIds();
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const q = searchParams.get('q')?.trim();

    const items = await prisma.foodDatabaseItem.findMany({
      where: {
        ...(sectionId && sectionId !== 'all' ? { sectionId } : {}),
        ...(q
          ? {
              name: { contains: q },
            }
          : {}),
      },
      include: {
        section: { select: { id: true, name: true, legacyId: true } },
      },
      orderBy: [{ legacyId: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({ items });
  } catch (e) {
    console.error('food-database items GET:', e);
    return NextResponse.json({ error: 'Failed to load food items' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { sectionId, name, isLiquid, per100, legacyId, imageUrl, nameTranslations } = body;

    if (!sectionId || !name?.trim()) {
      return NextResponse.json({ error: 'Section and name are required' }, { status: 400 });
    }

    const nextLegacyId =
      typeof legacyId === 'number' && Number.isFinite(legacyId) ? legacyId : await getNextFoodLegacyId();

    const item = await prisma.foodDatabaseItem.create({
      data: {
        sectionId,
        name: name.trim().toUpperCase(),
        isLiquid: !!isLiquid,
        legacyId: nextLegacyId,
        imageUrl: imageUrl?.trim() || null,
        nameTranslations: nameTranslations
          ? typeof nameTranslations === 'string'
            ? nameTranslations
            : serializeTranslations(nameTranslations)
          : null,
        ...nutrientsToDb(per100 || {}),
      },
      include: { section: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ item });
  } catch (e) {
    console.error('food-database items POST:', e);
    return NextResponse.json({ error: 'Failed to create food item' }, { status: 500 });
  }
}
