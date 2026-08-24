import { prisma } from '@/lib/prisma';

function formatUserName(user: {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
}): string {
  return [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;
}

export type OperatorOption = { id: string; name: string; image?: string | null };

/** Operators selectable on procedure forms (club admin + staff members). */
export async function fetchClubOperatorOptions(clubId: string): Promise<OperatorOption[]> {
  const operators: OperatorOption[] = [];
  const seen = new Set<string>();

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      admin: {
        select: { id: true, firstName: true, surname: true, name: true, username: true, image: true },
      },
    },
  });

  if (club?.admin) {
    operators.push({
      id: club.admin.id,
      name: formatUserName(club.admin),
      image: club.admin.image,
    });
    seen.add(club.admin.id);
  }

  const staffMembers = await prisma.clubStaff.findMany({
    where: { clubId },
    include: {
      user: {
        select: { id: true, firstName: true, surname: true, name: true, username: true, image: true },
      },
    },
  });

  for (const row of staffMembers) {
    if (seen.has(row.user.id)) continue;
    const name = formatUserName(row.user);
    if (!name) continue;
    operators.push({ id: row.user.id, name, image: row.user.image });
    seen.add(row.user.id);
  }

  operators.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return operators;
}
