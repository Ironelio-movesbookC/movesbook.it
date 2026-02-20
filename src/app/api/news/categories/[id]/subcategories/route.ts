import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
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
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;

    const subcategories = await prisma.newsCategory.findMany({
      where: {
        parentId: id,
        isActive: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { categoryName: 'asc' },
      ],
      include: {
        _count: {
          select: {
            news: true,
          },
        },
      },
    });

    return NextResponse.json(subcategories);
  } catch (error: any) {
    console.error('Error fetching subcategories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch subcategories', details: error.message },
      { status: 500 }
    );
  }
}
