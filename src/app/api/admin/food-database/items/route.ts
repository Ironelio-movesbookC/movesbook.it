import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import { nutrientsToDb } from '@/lib/foodDatabase.types';
import { getNextFoodLegacyId, assignMissingFoodLegacyIds } from '@/lib/foodDatabaseImport';
import { serializeTranslations } from '@/lib/foodDatabaseTranslations';

import { getFoodDatabaseSourceState } from '@/lib/foodDatabaseSourceState';
import { isLiveFoodDatabaseSource } from '@/constants/foodDatabaseSources';
import { searchLiveFoodDatabase } from '@/lib/foodDatabaseConnectors/liveSearch';
import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';

export async function GET(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    await assignMissingFoodLegacyIds();
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const q = searchParams.get('q')?.trim();
    const sourceParam = searchParams.get('sourceId');
    const state = await getFoodDatabaseSourceState();
    const sourceId = (sourceParam || state.activeSourceId) as FoodDatabaseSourceId;

    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(
      200,
      Math.max(10, Number.parseInt(searchParams.get('pageSize') || '50', 10) || 50)
    );
    const fetchAll = searchParams.get('all') === '1';

    if (isLiveFoodDatabaseSource(sourceId)) {
      if (!q || q.length < 2) {
        return NextResponse.json({ items: [], total: 0, page: 1, pageSize, sourceId, accessMode: 'live' });
      }
      const livePage = Math.max(1, page);
      const { items, total } = await searchLiveFoodDatabase(sourceId, q, { page: livePage, pageSize });
      return NextResponse.json({
        items: items.map((item) => ({
          id: item.id,
          legacyId: null,
          name: item.name,
          section: { id: 'live', name: item.sectionName || 'Live search' },
          calories: item.per100.calories,
          proteins: item.per100.proteins,
          carbohydrates: item.per100.carbohydrates,
          fats: item.per100.fats,
          fiber: item.per100.fiber,
          sourceId,
          isLive: true,
        })),
        total: total ?? items.length,
        page: livePage,
        pageSize,
        sourceId,
        accessMode: 'live',
      });
    }

    const where = {
      sourceId,
      ...(sectionId && sectionId !== 'all' ? { sectionId } : {}),
      ...(q ? { name: { contains: q } } : {}),
    };

    if (fetchAll) {
      const items = await prisma.foodDatabaseItem.findMany({
        where,
        include: {
          section: { select: { id: true, name: true, legacyId: true } },
        },
        orderBy: [{ legacyId: 'asc' }, { name: 'asc' }],
      });
      return NextResponse.json({
        items,
        total: items.length,
        page: 1,
        pageSize: items.length,
        sourceId,
        accessMode: 'import',
      });
    }

    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      prisma.foodDatabaseItem.findMany({
        where,
        include: {
          section: { select: { id: true, name: true, legacyId: true } },
        },
        orderBy: [{ legacyId: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.foodDatabaseItem.count({ where }),
    ]);

    return NextResponse.json({
      items,
      total,
      page,
      pageSize,
      sourceId,
      accessMode: 'import',
    });
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

    const section = await prisma.foodDatabaseSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const sourceId = section.sourceId;
    const nextLegacyId =
      typeof legacyId === 'number' && Number.isFinite(legacyId)
        ? legacyId
        : await getNextFoodLegacyId(sourceId);

    const item = await prisma.foodDatabaseItem.create({
      data: {
        sectionId,
        sourceId,
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
