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

export async function GET(request: NextRequest) {
  const auth = await requireSportMachineCompaniesAccess(request);
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');

    const recipes = await prisma.foodDatabaseRecipe.findMany({
      where: sectionId && sectionId !== 'all' ? { sectionId } : undefined,
      include: {
        section: { select: { id: true, name: true } },
      },
      orderBy: [{ legacyId: 'asc' }, { name: 'asc' }],
    });

    return NextResponse.json({
      recipes: recipes.map((r) => mapRecipe(r)),
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

    const recipe = await prisma.foodDatabaseRecipe.create({
      data: {
        sectionId,
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
