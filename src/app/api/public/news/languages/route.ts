import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const languages = await prisma.language.findMany({
      where: {
        isActive: true,
      },
      orderBy: [
        { isDefault: 'desc' },
        { code: 'asc' },
      ],
      select: {
        id: true,
        code: true,
        name: true,
      },
    });

    return NextResponse.json(languages);
  } catch (error: any) {
    console.error('Error fetching languages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch languages', details: error.message },
      { status: 500 }
    );
  }
}
