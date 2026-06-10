import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import { nutrientsToDb } from '@/lib/foodDatabase.types';
import { serializeTranslations } from '@/lib/foodDatabaseTranslations';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSportMachineCompaniesAccess(_request);
  if (!auth.ok) return auth.response;

  try {
    const item = await prisma.foodDatabaseItem.findUnique({
      where: { id: params.id },
      include: { section: true },
    });
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ item });
  } catch (e) {
    console.error('food-database item GET:', e);
    return NextResponse.json({ error: 'Failed to load item' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const { sectionId, name, isLiquid, per100, isActive, imageUrl, nameTranslations } = body;

    const item = await prisma.foodDatabaseItem.update({
      where: { id: params.id },
      data: {
        ...(sectionId ? { sectionId } : {}),
        ...(name ? { name: name.trim().toUpperCase() } : {}),
        ...(typeof isLiquid === 'boolean' ? { isLiquid } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(per100 ? nutrientsToDb(per100) : {}),
        ...(imageUrl !== undefined ? { imageUrl: imageUrl?.trim() || null } : {}),
        ...(nameTranslations !== undefined
          ? {
              nameTranslations:
                typeof nameTranslations === 'string'
                  ? nameTranslations
                  : serializeTranslations(nameTranslations),
            }
          : {}),
      },
      include: { section: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ item });
  } catch (e) {
    console.error('food-database item PUT:', e);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSportMachineCompaniesAccess(_request);
  if (!auth.ok) return auth.response;

  try {
    await prisma.foodDatabaseItem.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('food-database item DELETE:', e);
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }
}
