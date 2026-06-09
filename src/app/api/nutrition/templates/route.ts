import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// GET /api/nutrition/templates - List user's workout templates
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const templateType = searchParams.get('type'); // 'workout' or 'day'
    const search = searchParams.get('search');

    // Build filter
    const where: any = {
      userId: decoded.userId
    };

    if (category) {
      where.category = category;
    }

    if (templateType) {
      where.templateType = templateType;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
        { tags: { contains: search } }
      ];
    }

    const templates = await prisma.nutritionTemplate.findMany({
      where,
      orderBy: [
        { timesUsed: 'desc' }, // Most used first
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching workout templates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/nutrition/templates - Create new template
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      tags,
      templateType,
      templateData,
      sports,
      totalDistance,
      totalDuration,
      difficulty
    } = body;

    // Validate required fields
    if (!name || !templateData || !templateType) {
      return NextResponse.json(
        { error: 'Missing required fields: name, templateData, templateType' },
        { status: 400 }
      );
    }

    // Create template
    const template = await prisma.nutritionTemplate.create({
      data: {
        userId: decoded.userId,
        name,
        description: description || null,
        category: category || null,
        tags: tags ? JSON.stringify(tags) : null,
        templateType,
        templateData: JSON.stringify(templateData),
        sports: sports || null,
        totalDistance: totalDistance || null,
        totalDuration: totalDuration || null,
        difficulty: difficulty || null
      }
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating workout template:', error);
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    );
  }
}

