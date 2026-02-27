import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;

    const friends = await prisma.user.findMany({
      where: {
        OR: [
          {
            conversationsStarted: {
              some: {
                user2Id: userId,
              },
            },
          },
          {
            conversationsReceived: {
              some: {
                user1Id: userId,
              },
            },
          },
        ],
        id: {
          not: userId,
        },
      },
      select: {
        id: true,
        username: true,
        name: true,
      },
      take: 100,
    });

    return NextResponse.json({
      friends: friends.map((friend) => ({
        id: friend.id,
        username: friend.username || friend.name,
      })),
    });
  } catch (error) {
    console.error('Error fetching friends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch friends', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
