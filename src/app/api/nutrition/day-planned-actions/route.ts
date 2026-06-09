import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveNutritionDatabaseUserId } from '@/lib/nutritionUserId';
import type { Prisma, NutritionPlanType } from '@prisma/client';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const planType = searchParams.get('planType') as NutritionPlanType | null;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const templateId = searchParams.get('templateId');
    const sortBy = searchParams.get('sortBy') || 'date';
    const sortDir = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';

    const dayWhere: Prisma.NutritionDayWhereInput = { userId: dbUserId };

    if (planType) {
      dayWhere.nutritionWeek = {
        nutritionPlan: {
          userId: dbUserId,
          type: planType,
        },
      };
    }

    if (dateFrom || dateTo) {
      dayWhere.date = {};
      if (dateFrom) {
        const d = new Date(dateFrom);
        d.setHours(0, 0, 0, 0);
        (dayWhere.date as Prisma.DateTimeFilter).gte = d;
      }
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        (dayWhere.date as Prisma.DateTimeFilter).lte = d;
      }
    }

    const where: Prisma.NutritionDayPlannedActionWhereInput = {
      userId: dbUserId,
      nutritionDay: dayWhere,
      ...(templateId ? { templateId } : {}),
    };

    const orderBy: Prisma.NutritionDayPlannedActionOrderByWithRelationInput[] =
      sortBy === 'action'
        ? [{ nameSnapshot: sortDir }, { nutritionDay: { date: 'asc' } }]
        : [{ nutritionDay: { date: sortDir } }, { sortOrder: 'asc' }];

    const rows = await prisma.nutritionDayPlannedAction.findMany({
      where,
      orderBy,
      include: {
        nutritionDay: {
          select: {
            id: true,
            date: true,
            weekNumber: true,
            storageZone: true,
          },
        },
      },
    });

    return NextResponse.json({ actions: rows });
  } catch (e) {
    console.error('day-planned-actions GET', e);
    return NextResponse.json({ error: 'Failed to load actions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      nutritionDayId,
      templateId,
      description,
      textColor,
      backgroundColor,
      url,
    } = body;

    if (!nutritionDayId || !templateId) {
      return NextResponse.json(
        { error: 'nutritionDayId and templateId are required' },
        { status: 400 }
      );
    }

    const day = await prisma.nutritionDay.findFirst({
      where: { id: nutritionDayId, userId: dbUserId },
    });
    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    const tpl = await prisma.plannedActionTemplate.findFirst({
      where: { id: templateId, userId: dbUserId },
    });
    if (!tpl) {
      return NextResponse.json({ error: 'Action template not found' }, { status: 404 });
    }

    const maxOrder = await prisma.nutritionDayPlannedAction.aggregate({
      where: { nutritionDayId },
      _max: { sortOrder: true },
    });
    const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

    const row = await prisma.nutritionDayPlannedAction.create({
      data: {
        nutritionDayId,
        userId: dbUserId,
        templateId,
        nameSnapshot: tpl.name,
        iconSnapshot: tpl.icon,
        colorSnapshot: tpl.color,
        description:
          typeof description === 'string' && description.trim()
            ? description.trim()
            : null,
        textColor: textColor || null,
        backgroundColor: backgroundColor || null,
        url: url && String(url).trim() ? String(url).trim() : null,
        sortOrder,
      },
    });

    return NextResponse.json({ action: row });
  } catch (e) {
    console.error('day-planned-actions POST', e);
    return NextResponse.json({ error: 'Failed to create action' }, { status: 500 });
  }
}
