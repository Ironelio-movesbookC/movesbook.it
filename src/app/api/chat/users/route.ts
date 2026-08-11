import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';
import { buildChatAudienceWhere, isChatAudience } from '@/lib/chat/chatAudience';

export const dynamic = 'force-dynamic';

/** GET - List users who have a Telegram account (for starting a chat). Excludes current user.
 *  Query params:
 *    search - filter by telegramAccount (Telegram username) or name, case-insensitive partial match.
 *    audience - movesbook-staff | club-admin | club-staff | movesbook-user | …
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

    const searchRaw = request.nextUrl.searchParams.get('search')?.trim() ?? '';
    const searchNorm = searchRaw.replace(/^@+/, ''); // strip leading @ like Telegram
    const audienceRaw = request.nextUrl.searchParams.get('audience')?.trim() ?? '';
    const audience = isChatAudience(audienceRaw) ? audienceRaw : null;
    const clubId = request.nextUrl.searchParams.get('clubId')?.trim() || null;
    const audienceWhere = audience ? buildChatAudienceWhere(audience, myId, clubId) : null;

    if (audience && !audienceWhere) {
      return NextResponse.json({ users: [] });
    }

    // When scoping club-member/club-admin to a club, require caller membership
    if (clubId && (audience === 'club-member' || audience === 'club-admin')) {
      const membership = await prisma.clubMember.findUnique({
        where: { clubId_memberId: { clubId, memberId: myId } },
        select: { id: true },
      });
      if (!membership) {
        return NextResponse.json({ users: [] });
      }
    }

    const whereClause: Prisma.UserWhereInput = {
      id: { not: myId },
      telegramAccount: { not: null },
      ...(audienceWhere ?? {}),
    };

    if (searchNorm.length > 0) {
      whereClause.OR = [
        { telegramAccount: { contains: searchNorm } },
        { name: { contains: searchNorm } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, name: true, username: true, telegramAccount: true, lastSeenAt: true },
      orderBy: { name: 'asc' },
    });

    // When searching, put users whose telegramAccount matches at the top (prefix match first, then contains)
    let orderedUsers = users;
    if (searchNorm.length > 0) {
      const q = searchNorm.toLowerCase();
      orderedUsers = [...users].sort((a, b) => {
        const tgA = (a.telegramAccount ?? '').toLowerCase();
        const tgB = (b.telegramAccount ?? '').toLowerCase();
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        const score = (tg: string, name: string) => {
          if (tg.startsWith(q)) return 0;   // telegramAccount prefix match – top
          if (tg.includes(q)) return 1;     // telegramAccount contains – next
          if (name.includes(q)) return 2;   // name match only – after
          return 3;
        };
        const diff = score(tgA, nameA) - score(tgB, nameB);
        return diff !== 0 ? diff : nameA.localeCompare(nameB);
      });
    }

    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const usersWithPresence = orderedUsers.map((u) => ({
      id: u.id,
      name: u.name,
      username: u.username,
      telegramAccount: u.telegramAccount,
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
      isOnline:
        u.lastSeenAt != null && Date.now() - u.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS,
    }));

    return NextResponse.json({ users: usersWithPresence });
  } catch (error) {
    console.error('Chat users GET:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
