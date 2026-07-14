import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import { nutrientsToDb } from '@/lib/foodDatabase.types';
import { serializeTranslations } from '@/lib/foodDatabaseTranslations';

function mapRecipe(recipe: { componentsJson: string; [key: string]: unknown }) {
  return {
    ...recipe,
    components: JSON.parse(recipe.componentsJson || '[]'),
  };
}

import { getFoodDatabaseSourceState } from '@/lib/foodDatabaseSourceState';
import type { FoodDatabaseSourceId } from '@/constants/foodDatabaseSources';

export async function GET(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const sourceParam = searchParams.get('sourceId');
    const state = await getFoodDatabaseSourceState();
    const sourceId = (sourceParam || state.activeSourceId) as FoodDatabaseSourceId;

    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const pageSize = Math.min(
      200,
      Math.max(10, Number.parseInt(searchParams.get('pageSize') || '50', 10) || 50)
    );
    const skip = (page - 1) * pageSize;

    const where = {
      sourceId,
      ...(sectionId && sectionId !== 'all' ? { sectionId } : {}),
    };

    const [recipes, total] = await Promise.all([
      prisma.foodDatabaseRecipe.findMany({
        where,
        include: {
          section: { select: { id: true, name: true } },
        },
        orderBy: [{ legacyId: 'asc' }, { name: 'asc' }],
        skip,
        take: pageSize,
      }),
      prisma.foodDatabaseRecipe.count({ where }),
    ]);

    return NextResponse.json({
      recipes: recipes.map((r) => mapRecipe(r)),
      total,
      page,
      pageSize,
      sourceId,
    });
  } catch (e) {
    console.error('food-database recipes GET:', e);
    return NextResponse.json({ error: 'Failed to load recipes' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const body = await request.json();
    const {
      sectionId,
      name,
      description,
      components,
      per100,
      nameTranslations,
      preparationTranslations,
    } = body;

    if (!sectionId || !name?.trim()) {
      return NextResponse.json({ error: 'Section and name are required' }, { status: 400 });
    }

    const section = await prisma.foodDatabaseSection.findUnique({ where: { id: sectionId } });
    if (!section) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 });
    }

    const recipe = await prisma.foodDatabaseRecipe.create({
      data: {
        sectionId,
        sourceId: section.sourceId,
        name: name.trim().toUpperCase(),
        description: description?.trim() || null,
        componentsJson: JSON.stringify(components || []),
        nameTranslations: nameTranslations
          ? typeof nameTranslations === 'string'
            ? nameTranslations
            : serializeTranslations(nameTranslations)
          : null,
        preparationTranslations: preparationTranslations
          ? typeof preparationTranslations === 'string'
            ? preparationTranslations
            : serializeTranslations(preparationTranslations)
          : null,
        ...nutrientsToDb(per100 || {}),
      },
      include: { section: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ recipe: mapRecipe(recipe) });
  } catch (e) {
    console.error('food-database recipes POST:', e);
    return NextResponse.json({ error: 'Failed to create recipe' }, { status: 500 });
  }
}
