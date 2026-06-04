import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// GET /api/nutrition/templates/[id] - Get specific template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const template = await prisma.nutritionTemplate.findUnique({
      where: { id: params.id }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check ownership (or if public/shared)
    if (template.userId !== decoded.userId && !template.isPublic && !template.isShared) {
      return NextResponse.json(
        { error: 'Unauthorized to access this template' },
        { status: 403 }
      );
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error fetching workout template:', error);
    return NextResponse.json(
      { error: 'Failed to fetch template' },
      { status: 500 }
    );
  }
}

// PUT /api/nutrition/templates/[id] - Update template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify ownership
    const existing = await prisma.nutritionTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to update this template' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      tags,
      templateData,
      sports,
      totalDistance,
      totalDuration,
      difficulty
    } = body;

    // Update template
    const template = await prisma.nutritionTemplate.update({
      where: { id: params.id },
      data: {
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        category: category !== undefined ? category : existing.category,
        tags: tags !== undefined ? JSON.stringify(tags) : existing.tags,
        templateData: templateData !== undefined ? JSON.stringify(templateData) : existing.templateData,
        sports: sports !== undefined ? sports : existing.sports,
        totalDistance: totalDistance !== undefined ? totalDistance : existing.totalDistance,
        totalDuration: totalDuration !== undefined ? totalDuration : existing.totalDuration,
        difficulty: difficulty !== undefined ? difficulty : existing.difficulty
      }
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error('Error updating workout template:', error);
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/nutrition/templates/[id] - Delete template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    // Verify ownership
    const existing = await prisma.nutritionTemplate.findUnique({
      where: { id: params.id }
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    if (existing.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this template' },
        { status: 403 }
      );
    }

    await prisma.nutritionTemplate.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout template:', error);
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

