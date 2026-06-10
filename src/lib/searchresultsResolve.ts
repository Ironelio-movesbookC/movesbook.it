import { prisma } from '@/lib/prisma';

const userInclude = {
  mainSports: { select: { sport: true }, take: 8, orderBy: { order: 'asc' as const } },
} as const;

const clubInclude = {
  admin: {
    select: {
      name: true,
      image: true,
      country: true,
      profileBanner: true,
      profileBannerAlignment: true,
      profileBannerSequence: true,
      profileBannerVideo: true,
    },
  },
} as const;

function nameMatchVariants(value: string) {
  const v = value.trim();
  const lower = v.toLowerCase();
  const variants = new Set([v, lower]);
  if (v.length > 0) {
    variants.add(v[0].toUpperCase() + v.slice(1).toLowerCase());
  }
  return Array.from(variants);
}

/**
 * Resolves `/searchresults/search/[slug]`: user by username (case variants), then club / team / group by name.
 */
export async function resolveSearchResultsSlug(slug: string) {
  const trimmed = slug.trim();
  if (!trimmed) return null;

  if (/^c[a-z0-9]{20,}$/i.test(trimmed)) {
    const byId = await prisma.user.findUnique({
      where: { id: trimmed },
      include: userInclude,
    });
    if (byId) {
      return { kind: 'user' as const, user: byId };
    }
  }

  const user = await prisma.user.findFirst({
    where: { username: { in: nameMatchVariants(trimmed) } },
    include: userInclude,
  });

  if (user) {
    return { kind: 'user' as const, user };
  }

  const club = await prisma.club.findFirst({
    where: { name: { in: nameMatchVariants(trimmed) } },
    include: clubInclude,
  });

  if (club) {
    return { kind: 'club' as const, club };
  }

  const team = await prisma.team.findFirst({
    where: { name: { in: nameMatchVariants(trimmed) } },
  });

  if (team) {
    return { kind: 'team' as const, team };
  }

  const group = await prisma.group.findFirst({
    where: { name: { in: nameMatchVariants(trimmed) } },
  });

  if (group) {
    return { kind: 'group' as const, group };
  }

  return null;
}
