import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSportMachineCompaniesAccess } from '@/lib/adminPanelAuth';
import { nutrientsToDb } from '@/lib/foodDatabase.types';
import { serializeTranslations } from '@/lib/foodDatabaseTranslations';

function mapRecipe(recipe: {
  componentsJson: string;
  [key: string]: unknown;
}) {
  return {
    ...recipe,
    components: JSON.parse(recipe.componentsJson || '[]'),
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSportMachineCompaniesAccess(_request);
  if (!auth.ok) return auth.response;

  try {
    const recipe = await prisma.foodDatabaseRecipe.findUnique({
      where: { id: params.id },
      include: { section: { select: { id: true, name: true } } },
    });
    if (!recipe) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ recipe: mapRecipe(recipe) });
  } catch (e) {
    console.error('food-database recipe GET:', e);
    return NextResponse.json({ error: 'Failed to load recipe' }, { status: 500 });
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
    const {
      sectionId,
      name,
      description,
      components,
      per100,
      nameTranslations,
      preparationTranslations,
      isActive,
    } = body;

    const recipe = await prisma.foodDatabaseRecipe.update({
      where: { id: params.id },
      data: {
        ...(sectionId ? { sectionId } : {}),
        ...(name ? { name: name.trim().toUpperCase() } : {}),
        ...(description !== undefined ? { description: description?.trim() || null } : {}),
        ...(components ? { componentsJson: JSON.stringify(components) } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(per100 ? nutrientsToDb(per100) : {}),
        ...(nameTranslations !== undefined
          ? {
              nameTranslations:
                typeof nameTranslations === 'string'
                  ? nameTranslations
                  : serializeTranslations(nameTranslations),
            }
          : {}),
        ...(preparationTranslations !== undefined
          ? {
              preparationTranslations:
                typeof preparationTranslations === 'string'
                  ? preparationTranslations
                  : serializeTranslations(preparationTranslations),
            }
          : {}),
      },
      include: { section: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ recipe: mapRecipe(recipe) });
  } catch (e) {
    console.error('food-database recipe PUT:', e);
    return NextResponse.json({ error: 'Failed to update recipe' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireSportMachineCompaniesAccess(_request);
  if (!auth.ok) return auth.response;

  try {
    await prisma.foodDatabaseRecipe.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('food-database recipe DELETE:', e);
    return NextResponse.json({ error: 'Failed to delete recipe' }, { status: 500 });
  }
}
