import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';
import { buildChatAudienceWhere, isChatAudience } from '@/lib/chat/chatAudience';
import { DEFAULT_CLUB_MEMBER_NAME_VISIBILITY } from '@/lib/chat/clubMemberNameVisibility';
import {
  loadClubMemberNameVisibilityContext,
  loadClubMemberNameVisibilityMap,
  resolveClubMemberPublicName,
} from '@/lib/chat/loadClubMemberNameVisibility';

export const dynamic = 'force-dynamic';

/** GET - List users who have a Telegram account (for starting a chat). Excludes current user.
 *  Query params:
 *    search - filter by telegramAccount / username (and name when visibility allows), case-insensitive.
 *    audience - movesbook-staff | club-admin | club-staff | club-member | movesbook-user | …
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
      // Club-member: username / Telegram are always searchable; name match is gated later.
      if (audience === 'club-member') {
        whereClause.OR = [
          { telegramAccount: { contains: searchNorm } },
          { username: { contains: searchNorm } },
          { name: { contains: searchNorm } },
        ];
      } else {
        whereClause.OR = [
          { telegramAccount: { contains: searchNorm } },
          { name: { contains: searchNorm } },
        ];
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      select: { id: true, name: true, username: true, telegramAccount: true, lastSeenAt: true },
      orderBy: { name: 'asc' },
    });

    const visibilityCtx =
      audience === 'club-member'
        ? await loadClubMemberNameVisibilityContext(myId, clubId)
        : null;
    const visibilityMap =
      audience === 'club-member'
        ? await loadClubMemberNameVisibilityMap(users.map((u) => u.id))
        : null;

    let orderedUsers = users;

    if (audience === 'club-member' && visibilityCtx && visibilityMap) {
      orderedUsers = users.filter((u) => {
        if (searchNorm.length === 0) return true;
        const q = searchNorm.toLowerCase();
        const tg = (u.telegramAccount ?? '').toLowerCase().replace(/^@+/, '');
        const username = (u.username ?? '').toLowerCase();
        const matchedIdentity = tg.includes(q) || username.includes(q);
        if (matchedIdentity) return true;

        // Name-only match: only if viewer may see this member's whole name
        const name = u.name.toLowerCase();
        if (!name.includes(q)) return false;
        const visibility =
          visibilityMap.get(u.id) ?? DEFAULT_CLUB_MEMBER_NAME_VISIBILITY;
        const resolved = resolveClubMemberPublicName({
          viewerId: myId,
          target: u,
          visibility,
          ctx: visibilityCtx,
        });
        return !resolved.nameHidden;
      });
    }

    // When searching, put users whose telegramAccount / username matches at the top
    if (searchNorm.length > 0) {
      const q = searchNorm.toLowerCase();
      orderedUsers = [...orderedUsers].sort((a, b) => {
        const tgA = (a.telegramAccount ?? '').toLowerCase().replace(/^@+/, '');
        const tgB = (b.telegramAccount ?? '').toLowerCase().replace(/^@+/, '');
        const userA = (a.username ?? '').toLowerCase();
        const userB = (b.username ?? '').toLowerCase();
        const nameA = a.name.toLowerCase();
        const nameB = b.name.toLowerCase();
        const score = (tg: string, username: string, name: string) => {
          if (tg.startsWith(q) || username.startsWith(q)) return 0;
          if (tg.includes(q) || username.includes(q)) return 1;
          if (name.includes(q)) return 2;
          return 3;
        };
        const diff =
          score(tgA, userA, nameA) - score(tgB, userB, nameB);
        return diff !== 0 ? diff : nameA.localeCompare(nameB);
      });
    }

    const ONLINE_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes
    const usersWithPresence = orderedUsers.map((u) => {
      let name = u.name;
      let nameHidden = false;
      if (audience === 'club-member' && visibilityCtx && visibilityMap) {
        const visibility =
          visibilityMap.get(u.id) ?? DEFAULT_CLUB_MEMBER_NAME_VISIBILITY;
        const resolved = resolveClubMemberPublicName({
          viewerId: myId,
          target: u,
          visibility,
          ctx: visibilityCtx,
        });
        name = resolved.name;
        nameHidden = resolved.nameHidden;
      }
      return {
        id: u.id,
        name,
        username: u.username,
        telegramAccount: u.telegramAccount,
        nameHidden,
        lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
        isOnline:
          u.lastSeenAt != null && Date.now() - u.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS,
      };
    });

    return NextResponse.json({ users: usersWithPresence });
  } catch (error) {
    console.error('Chat users GET:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
