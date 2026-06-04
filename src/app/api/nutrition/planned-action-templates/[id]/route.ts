import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveNutritionDatabaseUserId } from '@/lib/nutritionUserId';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const dbUserId = await resolveNutritionDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.plannedActionTemplate.findFirst({
      where: { id, userId: dbUserId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      nameByLanguage,
      descriptionByLanguage,
      color,
      icon,
      displayOrder,
    } = body;

    const template = await prisma.plannedActionTemplate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: String(name).trim() }),
        ...(nameByLanguage !== undefined && {
          nameByLanguage:
            nameByLanguage && typeof nameByLanguage === 'object'
              ? JSON.stringify(nameByLanguage)
              : null,
        }),
        ...(descriptionByLanguage !== undefined && {
          descriptionByLanguage:
            descriptionByLanguage && typeof descriptionByLanguage === 'object'
              ? JSON.stringify(descriptionByLanguage)
              : null,
        }),
        ...(color !== undefined && { color: String(color) }),
        ...(icon !== undefined && { icon: String(icon) }),
        ...(displayOrder !== undefined && {
          displayOrder: Number(displayOrder) || 0,
        }),
      },
    });

    return NextResponse.json({ template });
  } catch (e) {
    console.error('planned-action-templates PATCH', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const dbUserId = await resolveNutritionDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.plannedActionTemplate.findFirst({
      where: { id, userId: dbUserId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const inUse = await prisma.nutritionDayPlannedAction.count({
      where: { templateId: id },
    });
    if (inUse > 0) {
      return NextResponse.json(
        {
          error:
            'This action type is used on planned days. Remove or reassign those entries first.',
        },
        { status: 409 }
      );
    }

    await prisma.plannedActionTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('planned-action-templates DELETE', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
