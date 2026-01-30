import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

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

    const mainSports = await prisma.userMainSport.findMany({
      where: { userId: decoded.userId },
      orderBy: { order: 'asc' }
    });

    const sports = mainSports.map(ms => ms.sport);

    return NextResponse.json({ sports });
  } catch (error) {
    console.error('Error fetching main sports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch main sports' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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
    const { sports } = body;

    // Delete existing and recreate with new order
    await prisma.userMainSport.deleteMany({
      where: { userId: decoded.userId }
    });

    const mainSports = await Promise.all(
      sports.map((sport: string, index: number) =>
        prisma.userMainSport.create({
          data: {
            userId: decoded.userId,
            sport: sport as any,
            order: index
          }
        })
      )
    );

    return NextResponse.json({ mainSports });
  } catch (error) {
    console.error('Error updating main sports:', error);
    return NextResponse.json(
      { error: 'Failed to update main sports' },
      { status: 500 }
    );
  }
}

