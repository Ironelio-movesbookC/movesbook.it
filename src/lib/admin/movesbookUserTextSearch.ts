import { Prisma } from '@prisma/client';

/**
 * Text search on User rows. When `matchOwnedClubs` is true, also matches club official name,
 * location, and form metadata in `clubs_new.description` (club username, etc.).
 */
export function buildMovesbookUserTextSearchOr(
  q: string,
  opts?: { matchOwnedClubs?: boolean },
): Prisma.UserWhereInput {
  const or: Prisma.UserWhereInput[] = [
    { username: { contains: q } },
    { email: { contains: q } },
    { name: { contains: q } },
    { firstName: { contains: q } },
    { surname: { contains: q } },
  ];

  if (opts?.matchOwnedClubs) {
    or.push({
      ownedClubs: {
        some: {
          OR: [
            { name: { contains: q } },
            { location: { contains: q } },
            { description: { contains: q } },
          ],
        },
      },
    });
  }

  return { OR: or };
}

export function segmentShouldMatchOwnedClubs(segment: string): boolean {
  return segment === 'clubs' || segment === 'all';
}
