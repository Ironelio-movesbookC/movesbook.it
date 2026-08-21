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
import { clubBelongingWhere } from '@/lib/chat/clubBelonging';
import { userBelongsToClub } from '@/lib/chat/userBelongsToClub';
import { DEFAULT_CLUB_MEMBER_NAME_VISIBILITY } from '@/lib/chat/clubMemberNameVisibility';
import {
  loadClubMemberNameVisibilityContext,
  loadClubMemberNameVisibilityMap,
  resolveClubMemberPublicName,
} from '@/lib/chat/loadClubMemberNameVisibility';
import {
  DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY,
  resolveMovesbookUserPublicName,
} from '@/lib/chat/movesbookUserNameVisibility';
import { loadMovesbookUserNameVisibilityMap } from '@/lib/chat/loadMovesbookUserNameVisibility';

async function loadMyClubAdminIds(myId: string, clubId?: string | null): Promise<Set<string>> {
  const clubs = await prisma.club.findMany({
    where: {
      ...clubBelongingWhere(myId),
      ...(clubId ? { id: clubId } : {}),
    },
    select: { adminId: true },
  });
  return new Set(clubs.map((c) => c.adminId).filter((id) => id && id !== myId));
}

/** Fellow ClubStaff userIds on clubs `myId` belongs to. */
async function loadMyFellowClubStaffIds(
  myId: string,
  clubId?: string | null
): Promise<Set<string>> {
  const clubs = await prisma.club.findMany({
    where: {
      ...clubBelongingWhere(myId),
      ...(clubId ? { id: clubId } : {}),
    },
    select: { id: true },
  });
  const clubIds = clubs.map((c) => c.id);
  if (clubIds.length === 0) return new Set();

  const staff = await prisma.clubStaff.findMany({
    where: {
      clubId: { in: clubIds },
      userId: { not: myId },
    },
    select: { userId: true },
  });
  return new Set(staff.map((s) => s.userId));
}

/** Club members (not staff, not admin) on clubs `myId` belongs to. */
async function loadMyFellowClubMemberIds(
  myId: string,
  clubId?: string | null
): Promise<Set<string>> {
  const clubs = await prisma.club.findMany({
    where: {
      ...clubBelongingWhere(myId),
      ...(clubId ? { id: clubId } : {}),
    },
    select: { id: true, adminId: true },
  });
  const clubIds = clubs.map((c) => c.id);
  if (clubIds.length === 0) return new Set();

  const adminIds = new Set(clubs.map((c) => c.adminId).filter(Boolean));

  const [members, staff] = await Promise.all([
    prisma.clubMember.findMany({
      where: {
        clubId: { in: clubIds },
        memberId: { not: myId },
      },
      select: { memberId: true },
    }),
    prisma.clubStaff.findMany({
      where: { clubId: { in: clubIds } },
      select: { userId: true },
    }),
  ]);

  const staffIds = new Set(staff.map((s) => s.userId));
  return new Set(
    members
      .map((m) => m.memberId)
      .filter((id) => !staffIds.has(id) && !adminIds.has(id))
  );
}

async function assertParticipantMatchesAudience(
  audience: ChatAudience,
  myId: string,
  participantId: string,
  clubId?: string | null
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const audienceWhere = buildChatAudienceWhere(audience, myId, clubId);
  if (!audienceWhere) {
    return { ok: false, error: 'This chat type is not available yet', status: 400 };
  }

  if (
    clubId &&
    (audience === 'club-member' || audience === 'club-admin' || audience === 'club-staff')
  ) {
    const belongs = await userBelongsToClub(myId, clubId);
    if (!belongs) {
      return { ok: false, error: 'Club membership required', status: 403 };
    }
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
    const clubId = request.nextUrl.searchParams.get('clubId')?.trim() || null;
    const audienceWhere = audience ? buildChatAudienceWhere(audience, myId, clubId) : null;

    if (audience && !audienceWhere) {
      return NextResponse.json({ conversations: [] });
    }

    if (
      clubId &&
      (audience === 'club-member' || audience === 'club-admin' || audience === 'club-staff')
    ) {
      const belongs = await userBelongsToClub(myId, clubId);
      if (!belongs) {
        return NextResponse.json({ conversations: [] });
      }
    }

    const myClubAdminIds =
      audience === 'club-admin' ? await loadMyClubAdminIds(myId, clubId) : undefined;
    const myFellowClubStaffIds =
      audience === 'club-staff' ? await loadMyFellowClubStaffIds(myId, clubId) : undefined;
    const myFellowClubMemberIds =
      audience === 'club-member' ? await loadMyFellowClubMemberIds(myId, clubId) : undefined;

    const conversations = await prisma.chatConversation.findMany({
      where: { OR: [{ user1Id: myId }, { user2Id: myId }] },
      include: {
        user1: {
          select: {
            id: true,
            name: true,
            username: true,
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
            username: true,
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
        myFellowClubStaffIds,
        myFellowClubMemberIds,
      });
    });

    const visibilityCtx =
      audience === 'club-member'
        ? await loadClubMemberNameVisibilityContext(myId, clubId)
        : null;
    const visibilityMap =
      audience === 'club-member'
        ? await loadClubMemberNameVisibilityMap(
            filtered.map((c) => (c.user1Id === myId ? c.user2.id : c.user1.id))
          )
        : null;

    const movesbookVisibilityMap =
      audience === 'movesbook-user'
        ? await loadMovesbookUserNameVisibilityMap(
            filtered.map((c) => (c.user1Id === myId ? c.user2.id : c.user1.id))
          )
        : null;

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

        let displayName = other.name;
        if (audience === 'club-member' && visibilityCtx && visibilityMap) {
          const visibility =
            visibilityMap.get(other.id) ?? DEFAULT_CLUB_MEMBER_NAME_VISIBILITY;
          displayName = resolveClubMemberPublicName({
            viewerId: myId,
            target: other,
            visibility,
            ctx: visibilityCtx,
          }).name;
        } else if (audience === 'movesbook-user' && movesbookVisibilityMap) {
          const visibility =
            movesbookVisibilityMap.get(other.id) ?? DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY;
          displayName = resolveMovesbookUserPublicName({
            viewerId: myId,
            target: other,
            visibility,
          }).name;
        }

        return {
          id: c.id,
          otherUser: {
            id: other.id,
            name: displayName,
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
    const clubId =
      typeof body?.clubId === 'string' && body.clubId.trim() ? body.clubId.trim() : null;
    if (audience) {
      const check = await assertParticipantMatchesAudience(
        audience,
        myId,
        participantId,
        clubId
      );
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
