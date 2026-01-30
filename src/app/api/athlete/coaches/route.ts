import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/athlete/coaches - List all coaches for an athlete
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

    // Get all coaches for this athlete
    const athleteCoaches = await prisma.coachAthlete.findMany({
      where: { athleteId: decoded.userId },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            userType: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const coaches = athleteCoaches.map(ac => ac.coach);

    return NextResponse.json({ coaches });
  } catch (error) {
    console.error('Error fetching coaches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch coaches' },
      { status: 500 }
    );
  }
}

