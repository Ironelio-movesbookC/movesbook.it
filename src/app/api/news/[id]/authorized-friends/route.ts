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
    const userId = decoded.userId;

    const news = await prisma.news.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 });
    }

    if (news.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const authorizedFriends = await prisma.$queryRaw<Array<{ friends_user_id: string }>>`
      SELECT DISTINCT friends_user_id
      FROM news_share_post
      WHERE news_id = ${id}
        AND user_id = ${userId}
        AND share_option = 3
        AND friends_user_id IS NOT NULL
    `;

    const friendIds = authorizedFriends.map((f) => f.friends_user_id);

    return NextResponse.json({ friendIds });
  } catch (error) {
    console.error('Error fetching authorized friends:', error);
    return NextResponse.json(
      { error: 'Failed to fetch authorized friends', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const userId = decoded.userId;
    const { friendIds } = await request.json();

    if (!Array.isArray(friendIds)) {
      return NextResponse.json({ error: 'friendIds must be an array' }, { status: 400 });
    }

    const news = await prisma.news.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 });
    }

    if (news.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.$executeRaw`
      DELETE FROM news_share_post
      WHERE news_id = ${id}
        AND user_id = ${userId}
        AND share_option = 3
    `;

    if (friendIds.length > 0) {
      for (const friendId of friendIds) {
        const trimmedFriendId = friendId.trim();
        if (!trimmedFriendId) continue;

        const existing = await prisma.$queryRaw<Array<{ count: bigint }>>`
          SELECT COUNT(*) as count
          FROM news_share_post
          WHERE user_id = ${userId}
            AND news_id = ${id}
            AND share_option = 3
            AND friends_user_id = ${trimmedFriendId}
        `;

        if (!existing[0] || existing[0].count === BigInt(0)) {
          await prisma.$executeRaw`
            INSERT INTO news_share_post 
            (id, user_id, news_id, share_option, friends_user_id, created)
            VALUES 
            (UUID(), ${userId}, ${id}, 3, ${trimmedFriendId}, NOW())
          `;
        }
      }
    }

    return NextResponse.json({ success: true, message: 'Visibility settings saved' });
  } catch (error) {
    console.error('Error saving authorized friends:', error);
    return NextResponse.json(
      { error: 'Failed to save authorized friends', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
