import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';
import {
  buildChatAudienceWhere,
  isChatAudience,
  peerMatchesChatAudience,
  type ChatAudience,
} from '@/lib/chat/chatAudience';

async function loadMyClubAdminIds(myId: string): Promise<Set<string>> {
  const clubs = await prisma.club.findMany({
    where: { members: { some: { memberId: myId } } },
    select: { adminId: true },
  });
  return new Set(clubs.map((c) => c.adminId));
}

/** Other users who share at least one club membership with `myId` (ClubMember table). */
async function loadMyFellowClubMemberIds(myId: string): Promise<Set<string>> {
  const myMemberships = await prisma.clubMember.findMany({
    where: { memberId: myId },
    select: { clubId: true },
  });
  const clubIds = myMemberships.map((m) => m.clubId);
  if (clubIds.length === 0) return new Set();

  const fellows = await prisma.clubMember.findMany({
    where: {
      clubId: { in: clubIds },
      memberId: { not: myId },
    },
    select: { memberId: true },
  });
  return new Set(fellows.map((f) => f.memberId));
}

async function assertParticipantMatchesAudience(
  audience: ChatAudience,
  myId: string,
  participantId: string
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const audienceWhere = buildChatAudienceWhere(audience, myId);
  if (!audienceWhere) {
    return { ok: false, error: 'This chat type is not available yet', status: 400 };
  }

  const match = await prisma.user.findFirst({
    where: {
      id: participantId,
      telegramAccount: { not: null },
      ...audienceWhere,
    },
    select: { id: true },
  });

  if (!match) {
    return {
      ok: false,
      error: 'Participant does not match the selected chat type',
      status: 400,
    };
  }
  return { ok: true };
}

/** GET - List my conversations (with last message preview).
 *  Query param: audience - when set, only conversations with matching peer users (telegram + role).
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

    const audienceRaw = request.nextUrl.searchParams.get('audience')?.trim() ?? '';
    const audience = isChatAudience(audienceRaw) ? audienceRaw : null;
    const audienceWhere = audience ? buildChatAudienceWhere(audience, myId) : null;

    if (audience && !audienceWhere) {
      return NextResponse.json({ conversations: [] });
    }

    const myClubAdminIds =
      audience === 'club-admin' ? await loadMyClubAdminIds(myId) : undefined;
    const myFellowClubMemberIds =
      audience === 'club-member' ? await loadMyFellowClubMemberIds(myId) : undefined;

    const conversations = await prisma.chatConversation.findMany({
      where: { OR: [{ user1Id: myId }, { user2Id: myId }] },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            telegramAccount: true,
            lastSeenAt: true,
            superAdminId: true,
            userType: true,
          },
        },
        user2: {
          select: {
            id: true,
            name: true,
            telegramAccount: true,
            lastSeenAt: true,
            superAdminId: true,
            userType: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { content: true, createdAt: true, senderId: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

    const filtered = conversations.filter((c) => {
      const other = c.user1Id === myId ? c.user2 : c.user1;
      if (!audience) return true;
      return peerMatchesChatAudience(audience, other, {
        myClubAdminIds,
        myFellowClubMemberIds,
      });
    });

    const list = await Promise.all(
      filtered.map(async (c) => {
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

/** POST - Get or create a conversation with another user (body: { participantId, audience? }). */
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
    const myId = await resolveMessageDatabaseUserId(decoded.userId, decoded.userType);
    if (!myId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }
    const body = await request.json();
    const participantId = body?.participantId;
    if (!participantId || participantId === myId) {
      return NextResponse.json({ error: 'Invalid participantId' }, { status: 400 });
    }

    const audience = isChatAudience(body?.audience) ? body.audience : null;
    if (audience) {
      const check = await assertParticipantMatchesAudience(audience, myId, participantId);
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: check.status });
      }
    } else {
      const participant = await prisma.user.findUnique({
        where: { id: participantId },
        select: { telegramAccount: true },
      });
      if (!participant?.telegramAccount) {
        return NextResponse.json(
          { error: 'Participant must have a Telegram account' },
          { status: 400 }
        );
      }
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
