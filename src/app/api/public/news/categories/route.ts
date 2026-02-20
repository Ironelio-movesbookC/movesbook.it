import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const categories = await prisma.newsCategory.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { categoryName: 'asc' },
      ],
      select: {
        id: true,
        categoryName: true,
      },
    });

    return NextResponse.json(categories);
  } catch (error: any) {
    console.error('Error fetching news categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news categories', details: error.message },
      { status: 500 }
    );
  }
}
