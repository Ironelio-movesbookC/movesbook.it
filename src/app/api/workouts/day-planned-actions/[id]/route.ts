import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

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
    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.workoutDayPlannedAction.findFirst({
      where: { id, userId: dbUserId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      workoutDayId,
      templateId,
      description,
      textColor,
      backgroundColor,
      url,
      sortOrder,
    } = body;

    let nameSnapshot = existing.nameSnapshot;
    let iconSnapshot = existing.iconSnapshot;
    let colorSnapshot = existing.colorSnapshot;
    let nextTemplateId = existing.templateId;

    if (templateId !== undefined && templateId !== existing.templateId) {
      if (!templateId) {
        return NextResponse.json(
          { error: 'templateId cannot be cleared' },
          { status: 400 }
        );
      }
      const tpl = await prisma.plannedActionTemplate.findFirst({
        where: { id: templateId, userId: dbUserId },
      });
      if (!tpl) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      nextTemplateId = templateId;
      nameSnapshot = tpl.name;
      iconSnapshot = tpl.icon;
      colorSnapshot = tpl.color;
    }

    if (workoutDayId !== undefined && workoutDayId !== existing.workoutDayId) {
      const day = await prisma.workoutDay.findFirst({
        where: { id: workoutDayId, userId: dbUserId },
      });
      if (!day) {
        return NextResponse.json({ error: 'Target day not found' }, { status: 404 });
      }
    }

    const maxOrder =
      workoutDayId && workoutDayId !== existing.workoutDayId
        ? await prisma.workoutDayPlannedAction.aggregate({
            where: { workoutDayId },
            _max: { sortOrder: true },
          })
        : null;

    const row = await prisma.workoutDayPlannedAction.update({
      where: { id },
      data: {
        ...(workoutDayId !== undefined && { workoutDayId }),
        ...(templateId !== undefined && {
          templateId: nextTemplateId,
          nameSnapshot,
          iconSnapshot,
          colorSnapshot,
        }),
        ...(description !== undefined && {
          description:
            typeof description === 'string' && description.trim()
              ? description.trim()
              : null,
        }),
        ...(textColor !== undefined && { textColor: textColor || null }),
        ...(backgroundColor !== undefined && {
          backgroundColor: backgroundColor || null,
        }),
        ...(url !== undefined && {
          url: url && String(url).trim() ? String(url).trim() : null,
        }),
        ...(maxOrder
          ? { sortOrder: (maxOrder._max.sortOrder ?? -1) + 1 }
          : sortOrder !== undefined
            ? { sortOrder: Number(sortOrder) || 0 }
            : {}),
      },
    });

    return NextResponse.json({ action: row });
  } catch (e) {
    console.error('day-planned-actions PATCH', e);
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
    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.workoutDayPlannedAction.findFirst({
      where: { id, userId: dbUserId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.workoutDayPlannedAction.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('day-planned-actions DELETE', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
