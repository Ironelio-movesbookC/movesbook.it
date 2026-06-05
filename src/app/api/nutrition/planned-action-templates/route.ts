import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveNutritionDatabaseUserId } from '@/lib/nutritionUserId';

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

    const templates = await prisma.plannedActionTemplate.findMany({
      where: { userId: dbUserId },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ templates });
  } catch (e) {
    console.error('planned-action-templates GET', e);
    return NextResponse.json({ error: 'Failed to load templates' }, { status: 500 });
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
      name,
      nameByLanguage,
      descriptionByLanguage,
      color,
      icon,
      displayOrder,
    } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const template = await prisma.plannedActionTemplate.create({
      data: {
        userId: dbUserId,
        name: name.trim(),
        nameByLanguage:
          nameByLanguage && typeof nameByLanguage === 'object'
            ? JSON.stringify(nameByLanguage)
            : null,
        descriptionByLanguage:
          descriptionByLanguage && typeof descriptionByLanguage === 'object'
            ? JSON.stringify(descriptionByLanguage)
            : null,
        color: typeof color === 'string' && color ? color : '#6366f1',
        icon: typeof icon === 'string' && icon ? icon : '📌',
        displayOrder:
          typeof displayOrder === 'number' && !Number.isNaN(displayOrder)
            ? displayOrder
            : 0,
      },
    });

    return NextResponse.json({ template });
  } catch (e) {
    console.error('planned-action-templates POST', e);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
