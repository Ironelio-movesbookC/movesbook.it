import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma, UserType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const SCOPES = ['single_user', 'coach', 'team', 'club'] as const;
type Scope = (typeof SCOPES)[number];

const MAX_TAKE = 25;
const MAX_QUERY_LEN = 120;

function isScope(s: string | null): s is Scope {
  return s !== null && (SCOPES as readonly string[]).includes(s);
}

function titleCaseUserType(ut: UserType): string {
  return ut
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function truncate(s: string | null | undefined, max: number): string | undefined {
  if (!s) return undefined;
  const t = s.trim();
  if (!t) return undefined;
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

type SearchItem = {
  kind: 'user' | 'team' | 'club';
  id: string;
  title: string;
  username: string | null;
  categoryLabel: string;
  lines: string[];
  image: string | null;
};

export async function GET(req: NextRequest) {
  const rawQ = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  const scopeParam = req.nextUrl.searchParams.get('scope') ?? 'single_user';

  if (!isScope(scopeParam)) {
    return NextResponse.json({ error: 'Invalid scope' }, { status: 400 });
  }
  if (rawQ.length > MAX_QUERY_LEN) {
    return NextResponse.json({ error: 'Query too long' }, { status: 400 });
  }

  if (!rawQ) {
    return NextResponse.json({
      scope: scopeParam,
      query: rawQ,
      items: [] as SearchItem[],
      total: 0,
    });
  }

  const q = rawQ;
  const nameOrUsername: Prisma.UserWhereInput = {
    OR: [
      { name: { contains: q } },
      { username: { contains: q } },
      { firstName: { contains: q } },
      { surname: { contains: q } },
    ],
  };

  try {
    if (scopeParam === 'single_user') {
      const where: Prisma.UserWhereInput = {
        NOT: { userType: 'ADMIN' },
        ...nameOrUsername,
      };

      const [rows, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: MAX_TAKE,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            username: true,
            userType: true,
            country: true,
            image: true,
            mainSports: { select: { sport: true }, take: 4, orderBy: { order: 'asc' } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      const items: SearchItem[] = rows.map((u) => {
        const sports = u.mainSports.map((m) => String(m.sport).replace(/_/g, ' ')).join(', ');
        const lines: string[] = [];
        if (u.country) lines.push(u.country);
        lines.push(
          sports ? `${titleCaseUserType(u.userType)}, ${sports}` : titleCaseUserType(u.userType)
        );
        return {
          kind: 'user' as const,
          id: u.id,
          title: u.name,
          username: u.username,
          categoryLabel: titleCaseUserType(u.userType),
          lines,
          image: u.image,
        };
      });

      return NextResponse.json({ scope: scopeParam, query: q, items, total });
    }

    if (scopeParam === 'coach') {
      const where: Prisma.UserWhereInput = {
        userType: 'COACH',
        ...nameOrUsername,
      };

      const [rows, total] = await Promise.all([
        prisma.user.findMany({
          where,
          take: MAX_TAKE,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            username: true,
            userType: true,
            country: true,
            image: true,
            mainSports: { select: { sport: true }, take: 4, orderBy: { order: 'asc' } },
          },
        }),
        prisma.user.count({ where }),
      ]);

      const items: SearchItem[] = rows.map((u) => {
        const sports = u.mainSports.map((m) => String(m.sport).replace(/_/g, ' ')).join(', ');
        const lines: string[] = [];
        if (u.country) lines.push(u.country);
        if (u.username) lines.push(`@${u.username}`);
        if (sports) lines.push(sports);
        return {
          kind: 'user' as const,
          id: u.id,
          title: u.name,
          username: u.username,
          categoryLabel: titleCaseUserType(u.userType),
          lines,
          image: u.image,
        };
      });

      return NextResponse.json({ scope: scopeParam, query: q, items, total });
    }

    if (scopeParam === 'team') {
      const where: Prisma.TeamWhereInput = {
        OR: [
          { name: { contains: q } },
          { description: { contains: q } },
          { sport: { contains: q } },
        ],
      };

      const [rows, total] = await Promise.all([
        prisma.team.findMany({
          where,
          take: MAX_TAKE,
          orderBy: { name: 'asc' },
          select: { id: true, name: true, description: true, sport: true },
        }),
        prisma.team.count({ where }),
      ]);

      const items: SearchItem[] = rows.map((t) => ({
        kind: 'team' as const,
        id: t.id,
        title: t.name,
        username: null,
        categoryLabel: 'Team',
        lines: [t.sport, truncate(t.description, 140)].filter(Boolean) as string[],
        image: null,
      }));

      return NextResponse.json({ scope: scopeParam, query: q, items, total });
    }

    // club
    const where: Prisma.ClubWhereInput = {
      OR: [
        { name: { contains: q } },
        { description: { contains: q } },
        { location: { contains: q } },
      ],
    };

    const [rows, total] = await Promise.all([
      prisma.club.findMany({
        where,
        take: MAX_TAKE,
        orderBy: { name: 'asc' },
        select: { id: true, name: true, description: true, location: true },
      }),
      prisma.club.count({ where }),
    ]);

    const items: SearchItem[] = rows.map((c) => ({
      kind: 'club' as const,
      id: c.id,
      title: c.name,
      username: null,
      categoryLabel: 'Club',
      lines: [c.location, truncate(c.description, 140)].filter(Boolean) as string[],
      image: null,
    }));

    return NextResponse.json({ scope: scopeParam, query: q, items, total });
  } catch (e) {
    console.error('network-search', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
