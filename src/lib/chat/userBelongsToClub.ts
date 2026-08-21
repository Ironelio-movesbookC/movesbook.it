import { prisma } from '@/lib/prisma';
import { clubBelongingWhere } from '@/lib/chat/clubBelonging';

/** True when the user is a member or staff of the given club. Server-only. */
export async function userBelongsToClub(
  userId: string,
  clubId: string
): Promise<boolean> {
  const club = await prisma.club.findFirst({
    where: {
      id: clubId,
      ...clubBelongingWhere(userId),
    },
    select: { id: true },
  });
  return !!club;
}
