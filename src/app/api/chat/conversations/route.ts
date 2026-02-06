import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/** GET - List my conversations (with last message preview). */
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
    const myId = decoded.userId;

    const conversations = await prisma.chatConversation.findMany({
      where: { OR: [{ user1Id: myId }, { user2Id: myId }] },
      include: {
        user1: { select: { id: true, name: true, telegramAccount: true, lastSeenAt: true } },
        user2: { select: { id: true, name: true, telegramAccount: true, lastSeenAt: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

    const list = await Promise.all(
      conversations.map(async (c) => {
        const other = c.user1Id === myId ? c.user2 : c.user1;
        const last = c.messages[0] ?? null;
        const myLastReadAt = c.user1Id === myId ? c.user1LastReadAt : c.user2LastReadAt;

        const unreadCount = await prisma.chatMessage.count({
          where: {
            conversationId: c.id,
            senderId: { not: myId },
            ...(myLastReadAt ? { createdAt: { gt: myLastReadAt } } : {}),
          },
        });

        const isOnline =
          other.lastSeenAt != null && Date.now() - other.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS;

        return {
          id: c.id,
          otherUser: {
            id: other.id,
            name: other.name,
            telegramAccount: other.telegramAccount,
            lastSeenAt: other.lastSeenAt?.toISOString() ?? null,
            isOnline,
          },
          lastMessage: last
            ? { content: last.content, createdAt: last.createdAt, isOwn: last.senderId === myId }
            : null,
          updatedAt: c.updatedAt,
          unreadCount,
        };
      })
    );

    return NextResponse.json({ conversations: list });
  } catch (error) {
    console.error('Chat conversations GET:', error);
    return NextResponse.json({ error: 'Failed to load conversations' }, { status: 500 });
  }
}

/** POST - Get or create a conversation with another user (body: { participantId }). */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const myId = decoded.userId;
    const body = await request.json();
    const participantId = body?.participantId;
    if (!participantId || participantId === myId) {
      return NextResponse.json({ error: 'Invalid participantId' }, { status: 400 });
    }

    const [id1, id2] = [myId, participantId].sort();
    let conv = await prisma.chatConversation.findUnique({
      where: { user1Id_user2Id: { user1Id: id1, user2Id: id2 } },
      include: {
        user1: { select: { id: true, name: true, telegramAccount: true } },
        user2: { select: { id: true, name: true, telegramAccount: true } },
      },
    });
    if (!conv) {
      conv = await prisma.chatConversation.create({
        data: { user1Id: id1, user2Id: id2 },
        include: {
          user1: { select: { id: true, name: true, telegramAccount: true } },
          user2: { select: { id: true, name: true, telegramAccount: true } },
        },
      });
    }

    const other = conv.user1Id === myId ? conv.user2 : conv.user1;
    return NextResponse.json({
      id: conv.id,
      otherUser: { id: other.id, name: other.name, telegramAccount: other.telegramAccount },
    });
  } catch (error) {
    console.error('Chat conversations POST:', error);
    return NextResponse.json({ error: 'Failed to get or create conversation' }, { status: 500 });
  }
}
