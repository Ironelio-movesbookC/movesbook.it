import { prisma } from '@/lib/prisma';

export type ClubMemberOption = { id: string; name: string };

function formatMemberName(user: {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
}): string {
  return [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;
}

/** Club members for procedure input forms (sorted by name). */
export async function fetchClubMemberOptions(clubId: string): Promise<ClubMemberOption[]> {
  const clubMembers = await prisma.clubMember.findMany({
    where: { clubId },
    include: {
      member: {
        select: { id: true, name: true, firstName: true, surname: true, username: true },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const members: ClubMemberOption[] = [];
  for (const cm of clubMembers) {
    const name = formatMemberName(cm.member);
    if (!name) continue;
    members.push({ id: cm.member.id, name });
  }

  members.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return members;
}
