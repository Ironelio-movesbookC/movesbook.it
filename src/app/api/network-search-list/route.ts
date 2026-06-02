import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { isClubAccountUserType } from '@/utils/dashboardRouting';
import type { Prisma, UserType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const MAX_EACH = 20;
const MAX_QUERY_LEN = 120;

type SearchListLegendKey =
  | 'single_user'
  | 'coach'
  | 'group'
  | 'team'
  | 'club'
  | 'public_figure';

type SearchListRow = {
  legendKey: SearchListLegendKey;
  resultType: 'user' | 'group' | 'team' | 'club';
  id: string;
  title: string;
  username: string | null;
  image: string | null;
  country: string | null;
  roleLine: string;
  mutualLine: string | null;
  subscribedSince: string | null;
  isClubMember: boolean;
};

function getTokenUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ? String(decoded.userId) : null;
}

function titleCaseUserType(ut: UserType): string {
  return ut
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function userLegendKey(ut: UserType): SearchListLegendKey {
  if (ut === 'COACH') return 'coach';
  if (ut === 'GROUP' || ut === 'GROUP_ADMIN') return 'group';
  return 'single_user';
}

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const source = req.nextUrl.searchParams.get('source') ?? 'mypage';

  if (rawQ.length > MAX_QUERY_LEN) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  if (!rawQ) {
    return NextResponse.json({ query: rawQ, source, rows: [] as SearchListRow[] });
  }

  const q = rawQ;
  const userOr: Prisma.UserWhereInput = {
    OR: [
      { name: { contains: q } },
      { username: { contains: q } },
      { firstName: { contains: q } },
      { surname: { contains: q } },
    ],
  };

  const userWhere: Prisma.UserWhereInput = {
    NOT: { userType: { in: ['ADMIN', 'CLUB', 'CLUB_TRAINER'] } },
    ...userOr,
  };

  try {
    const viewerUserId = getTokenUserId(req);
    let viewerClubIds: string[] = [];
    if (viewerUserId) {
      const viewer = await prisma.user.findUnique({
        where: { id: viewerUserId },
        select: {
          userType: true,
          ownedClubs: { select: { id: true }, take: 5 },
        },
      });
      if (viewer && isClubAccountUserType(viewer.userType)) {
        viewerClubIds = viewer.ownedClubs.map((c) => c.id);
      }
    }

    const [users, groups, teams, clubs] = await Promise.all([
      prisma.user.findMany({
        where: userWhere,
        take: MAX_EACH,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          username: true,
          userType: true,
          country: true,
          image: true,
          createdAt: true,
          mainSports: { select: { sport: true }, take: 5, orderBy: { order: 'asc' } },
        },
      }),
      prisma.group.findMany({
        where: {
          OR: [{ name: { contains: q } }, { description: { contains: q } }],
        },
        take: MAX_EACH,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true },
      }),
      prisma.team.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { sport: { contains: q } },
          ],
        },
        take: MAX_EACH,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true, sport: true },
      }),
      prisma.club.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { description: { contains: q } },
            { location: { contains: q } },
          ],
        },
        take: MAX_EACH,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true, location: true },
      }),
    ]);

    const userIds = users.map((u) => u.id);
    const clubMemberIds = new Set<string>();
    if (viewerClubIds.length > 0 && userIds.length > 0) {
      const memberships = await prisma.clubMember.findMany({
        where: {
          clubId: { in: viewerClubIds },
          memberId: { in: userIds },
        },
        select: { memberId: true },
      });
      for (const m of memberships) clubMemberIds.add(m.memberId);
    }

    const rows: SearchListRow[] = [];

    for (const u of users) {
      const sports = u.mainSports.map((m) => String(m.sport).replace(/_/g, ' ')).join(', ');
      const roleLine = sports
        ? `${titleCaseUserType(u.userType)}, ${sports}`
        : titleCaseUserType(u.userType);
      rows.push({
        legendKey: userLegendKey(u.userType),
        resultType: 'user',
        id: u.id,
        title: u.name,
        username: u.username,
        image: u.image,
        country: u.country,
        roleLine,
        mutualLine: null,
        subscribedSince: u.createdAt.toISOString(),
        isClubMember: clubMemberIds.has(u.id),
      });
    }

    for (const g of groups) {
      const desc = g.description?.trim();
      rows.push({
        legendKey: 'group',
        resultType: 'group',
        id: g.id,
        title: g.name,
        username: null,
        image: null,
        country: null,
        roleLine:
          desc && desc.length > 0
            ? `Group · ${desc.slice(0, 80)}${desc.length > 80 ? '…' : ''}`
            : 'Group',
        mutualLine: null,
        subscribedSince: null,
        isClubMember: false,
      });
    }

    for (const t of teams) {
      const parts = [t.sport, t.description?.trim()].filter(Boolean) as string[];
      rows.push({
        legendKey: 'team',
        resultType: 'team',
        id: t.id,
        title: t.name,
        username: null,
        image: null,
        country: null,
        roleLine: parts.length ? `Team · ${parts.join(' · ').slice(0, 100)}` : 'Team',
        mutualLine: null,
        subscribedSince: null,
        isClubMember: false,
      });
    }

    for (const c of clubs) {
      const loc = c.location?.trim();
      const d = c.description?.trim();
      rows.push({
        legendKey: 'club',
        resultType: 'club',
        id: c.id,
        title: c.name,
        username: null,
        image: null,
        country: loc ?? null,
        roleLine:
          d && d.length > 0
            ? `Club · ${d.slice(0, 100)}${d.length > 100 ? '…' : ''}`
            : 'Club',
        mutualLine: null,
        subscribedSince: null,
        isClubMember: false,
      });
    }

    // Optional: public figures — not modeled; keep endpoint shape for UI legend
    if (source !== 'mypage' && source !== 'myclub') {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }

    return NextResponse.json({
      query: q,
      source,
      rows,
    });
  } catch (e) {
    console.error('network-search-list', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
