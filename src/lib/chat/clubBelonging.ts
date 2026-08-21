import type { Prisma } from '@prisma/client';

/**
 * Clubs the user "belongs to" for chat: owner, ClubMember, and/or ClubStaff.
 * Club staff accounts are linked via club_staff, not club_members_new.
 * Safe for client bundles (no PrismaClient / fs).
 */
export function clubBelongingWhere(userId: string): Prisma.ClubWhereInput {
  return {
    OR: [
      { adminId: userId },
      { members: { some: { memberId: userId } } },
      { staff: { some: { userId } } },
    ],
  };
}
