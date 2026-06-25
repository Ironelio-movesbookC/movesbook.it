import { prisma } from '@/lib/prisma';

function formatUserName(user: {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
}): string {
  return [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;
}

export type OperatorOption = { id: string; name: string };

/** Operators selectable on procedure forms (club admin + staff members). */
export async function fetchClubOperatorOptions(clubId: string): Promise<OperatorOption[]> {
  const operators: OperatorOption[] = [];
  const seen = new Set<string>();

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      admin: {
        select: { id: true, firstName: true, surname: true, name: true, username: true },
      },
    },
  });

  if (club?.admin) {
    operators.push({ id: club.admin.id, name: formatUserName(club.admin) });
    seen.add(club.admin.id);
  }

  const staffMembers = await prisma.clubMember.findMany({
    where: { clubId },
    include: {
      member: {
        select: { id: true, firstName: true, surname: true, name: true, username: true },
      },
    },
  });

  for (const row of staffMembers) {
    if (seen.has(row.member.id)) continue;
    const role = String(row.role ?? '').toLowerCase();
    const isStaff =
      !role ||
      role.includes('trainer') ||
      role.includes('operator') ||
      role.includes('staff') ||
      role.includes('employee');
    if (!isStaff) continue;
    const name = formatUserName(row.member);
    if (!name) continue;
    operators.push({ id: row.member.id, name });
    seen.add(row.member.id);
  }

  operators.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return operators;
}
