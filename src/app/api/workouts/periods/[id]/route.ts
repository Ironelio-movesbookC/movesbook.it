import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
    const { name, description, color, descriptionTranslations: dtRaw, descriptionByLanguage } = body;

    let descriptionTranslations: string | null | undefined = undefined;
    if (descriptionByLanguage !== undefined && descriptionByLanguage !== null) {
      const cleaned: Record<string, string> = {};
      for (const [k, v] of Object.entries(descriptionByLanguage as Record<string, unknown>)) {
        if (typeof v === 'string' && v.trim()) cleaned[k] = v.trim().slice(0, 2000);
      }
      descriptionTranslations = Object.keys(cleaned).length > 0 ? JSON.stringify(cleaned) : null;
    } else if (dtRaw !== undefined) {
      descriptionTranslations =
        typeof dtRaw === 'string' && dtRaw ? dtRaw : null;
    }

    const period = await prisma.period.update({
      where: {
        id: params.id,
        userId: decoded.userId
      },
      data: {
        name,
        description,
        color,
        ...(descriptionTranslations !== undefined && { descriptionTranslations })
      }
    });

    return NextResponse.json({ period });
  } catch (error) {
    console.error('Error updating period:', error);
    return NextResponse.json(
      { error: 'Failed to update period' },
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

    await prisma.period.delete({
      where: {
        id: params.id,
        userId: decoded.userId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting period:', error);
    return NextResponse.json(
      { error: 'Failed to delete period' },
      { status: 500 }
    );
  }
}

