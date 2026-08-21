import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';

/**
 * GET — Total unread 1:1 chat messages for the current user
 * (sum of unread counts across all conversations).
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const myId = await resolveMessageDatabaseUserId(decoded.userId, decoded.userType);
    if (!myId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const conversations = await prisma.chatConversation.findMany({
      where: { OR: [{ user1Id: myId }, { user2Id: myId }] },
      select: {
        id: true,
        user1Id: true,
        user1LastReadAt: true,
        user2LastReadAt: true,
      },
    });

    const counts = await Promise.all(
      conversations.map((c) => {
        const myLastReadAt = c.user1Id === myId ? c.user1LastReadAt : c.user2LastReadAt;
        return prisma.chatMessage.count({
          where: {
            conversationId: c.id,
            senderId: { not: myId },
            ...(myLastReadAt ? { createdAt: { gt: myLastReadAt } } : {}),
          },
        });
      })
    );

    const unreadCount = counts.reduce((sum, n) => sum + n, 0);
    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('Chat unread-count GET:', error);
    return NextResponse.json({ error: 'Failed to load unread count' }, { status: 500 });
  }
}
