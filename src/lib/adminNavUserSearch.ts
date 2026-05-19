import { Prisma, UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { NavSearchScope, NavUserSearchRow } from '@/lib/adminNavUserSearchScope';

const SCOPE_USER_TYPES: Record<Exclude<NavSearchScope, 'all'>, UserType[]> = {
  athletes: [UserType.ATHLETE],
  coaches: [UserType.COACH],
  teams: [UserType.TEAM, UserType.TEAM_MANAGER],
  clubs: [UserType.CLUB, UserType.CLUB_TRAINER],
  groups: [UserType.GROUP, UserType.GROUP_ADMIN],
};

const ALL_MOVESBOOK_TYPES: UserType[] = [
  UserType.ATHLETE,
  UserType.COACH,
  UserType.TEAM,
  UserType.TEAM_MANAGER,
  UserType.CLUB,
  UserType.CLUB_TRAINER,
  UserType.GROUP,
  UserType.GROUP_ADMIN,
];

function formatLastLogin(d: Date | null): string {
  if (!d) return '—';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export async function searchMovesbookUsersForNav(
  scope: NavSearchScope,
  query: string,
  limit = 50,
): Promise<{ users: NavUserSearchRow[]; total: number }> {
  const types = scope === 'all' ? ALL_MOVESBOOK_TYPES : SCOPE_USER_TYPES[scope];
  const q = query.trim();

  const andClauses: Prisma.UserWhereInput[] = [{ userType: { in: types } }];

  if (q) {
    andClauses.push({
      OR: [
        { username: { contains: q } },
        { email: { contains: q } },
        { name: { contains: q } },
        { firstName: { contains: q } },
        { surname: { contains: q } },
      ],
    });
  }

  const where: Prisma.UserWhereInput = { AND: andClauses };

  const [total, rows] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        name: true,
        firstName: true,
        surname: true,
        country: true,
        image: true,
        userType: true,
        lastSeenAt: true,
        settings: { select: { language: true } },
      },
      orderBy: { username: 'asc' },
      take: limit,
    }),
  ]);

  return {
    total,
    users: rows.map((u) => {
      const displayName =
        [u.firstName, u.surname].filter(Boolean).join(' ').trim() || u.name || u.username;
      return {
        id: u.id,
        username: u.username,
        name: displayName,
        country: u.country?.trim() || '—',
        language: (u.settings?.language ?? 'en').toUpperCase(),
        lastLogin: formatLastLogin(u.lastSeenAt),
        imageUrl: u.image,
        userType: u.userType,
      };
    }),
  };
}
