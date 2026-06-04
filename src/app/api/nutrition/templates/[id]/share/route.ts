import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

// PATCH /api/nutrition/templates/[id]/share - Toggle template sharing status
export async function PATCH(
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

    const { id } = params;
    const body = await request.json();
    const { isShared } = body;

    if (typeof isShared !== 'boolean') {
      return NextResponse.json({ error: 'isShared must be a boolean' }, { status: 400 });
    }

    // Verify ownership
    const template = await prisma.nutritionTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    if (template.userId !== decoded.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Update sharing status
    const updatedTemplate = await prisma.nutritionTemplate.update({
      where: { id },
      data: { isShared }
    });

    return NextResponse.json({ template: updatedTemplate });
  } catch (error) {
    console.error('Error updating template sharing:', error);
    return NextResponse.json(
      { error: 'Failed to update template sharing' },
      { status: 500 }
    );
  }
}

