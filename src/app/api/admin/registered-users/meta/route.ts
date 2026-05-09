import { NextRequest, NextResponse } from 'next/server';
import { SportType, UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const SEGMENT_TYPES: Record<string, UserType[]> = {
  'single-user': [UserType.ATHLETE],
  coaches: [UserType.COACH],
  groups: [UserType.GROUP, UserType.GROUP_ADMIN],
  teams: [UserType.TEAM, UserType.TEAM_MANAGER],
  clubs: [UserType.CLUB, UserType.CLUB_TRAINER],
};

function sportLabel(s: SportType): string {
  return s
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const segment = url.searchParams.get('segment') || 'single-user';
  const types = SEGMENT_TYPES[segment];
  if (!types) {
    return NextResponse.json({ error: 'Invalid segment' }, { status: 400 });
  }

  const grouped = await prisma.user.groupBy({
    by: ['country'],
    where: {
      userType: { in: types },
      country: { not: null },
    },
  });

  const countries = grouped
    .map((g) => g.country)
    .filter((c): c is string => typeof c === 'string' && c.length > 0)
    .sort((a, b) => a.localeCompare(b));

  const sports = Object.values(SportType).map((sport) => ({
    value: sport,
    label: sportLabel(sport),
  }));

  return NextResponse.json({ countries, sports });
}
