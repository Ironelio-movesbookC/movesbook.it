import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

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

    const body = await request.json();
    const { name, description, color } = body;

    const section = await prisma.nutritionSection.update({
      where: {
        id: params.id,
        userId: decoded.userId
      },
      data: {
        name,
        description,
        color
      }
    });

    return NextResponse.json({ section });
  } catch (error) {
    console.error('Error updating workout section:', error);
    return NextResponse.json(
      { error: 'Failed to update workout section' },
      { status: 500 }
    );
  }
}

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

    await prisma.nutritionSection.delete({
      where: {
        id: params.id,
        userId: decoded.userId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workout section:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout section' },
      { status: 500 }
    );
  }
}

