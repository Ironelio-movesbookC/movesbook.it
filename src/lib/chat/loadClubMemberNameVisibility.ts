import { prisma } from '@/lib/prisma';
import {
  canViewerSeeClubMemberName,
  clubMemberNameVisibilityFromSocialSettings,
  isClubStaffRole,
  maskedClubMemberDisplayName,
  type ClubMemberNameVisibility,
  type ClubMemberNameVisibilityContext,
} from '@/lib/chat/clubMemberNameVisibility';

/**
 * Build viewer/admin/staff + club roster maps for name-visibility checks.
 * Optionally scope to a single club.
 */
export async function loadClubMemberNameVisibilityContext(
  viewerId: string,
  clubId?: string | null
): Promise<ClubMemberNameVisibilityContext> {
  const scopedClubId = typeof clubId === 'string' ? clubId.trim() : '';

  const ownedClubs = await prisma.club.findMany({
    where: scopedClubId
      ? { adminId: viewerId, id: scopedClubId }
      : { adminId: viewerId },
    select: { id: true },
  });
  const viewerAdminClubIds = new Set(ownedClubs.map((c) => c.id));

  const viewerMemberships = await prisma.clubMember.findMany({
    where: scopedClubId
      ? { memberId: viewerId, clubId: scopedClubId }
      : { memberId: viewerId },
    select: { clubId: true, role: true },
  });

  const viewerStaffClubIds = new Set<string>();
  const relevantClubIds = new Set<string>(viewerAdminClubIds);

  for (const m of viewerMemberships) {
    relevantClubIds.add(m.clubId);
    if (isClubStaffRole(m.role)) {
      viewerStaffClubIds.add(m.clubId);
    }
  }

  // Also include clubs the viewer belongs to when not admin (fellow clubs)
  if (!scopedClubId) {
    for (const m of viewerMemberships) {
      relevantClubIds.add(m.clubId);
    }
  } else if (relevantClubIds.size === 0) {
    relevantClubIds.add(scopedClubId);
  }

  const clubIds = [...relevantClubIds];
  const clubMemberIdsByClub = new Map<string, Set<string>>();

  if (clubIds.length === 0) {
    return { viewerAdminClubIds, viewerStaffClubIds, clubMemberIdsByClub };
  }

  const [clubs, memberships] = await Promise.all([
    prisma.club.findMany({
      where: { id: { in: clubIds } },
      select: { id: true, adminId: true },
    }),
    prisma.clubMember.findMany({
      where: { clubId: { in: clubIds } },
      select: { clubId: true, memberId: true },
    }),
  ]);

  for (const club of clubs) {
    const set = clubMemberIdsByClub.get(club.id) ?? new Set<string>();
    set.add(club.adminId);
    clubMemberIdsByClub.set(club.id, set);
  }
  for (const row of memberships) {
    const set = clubMemberIdsByClub.get(row.clubId) ?? new Set<string>();
    set.add(row.memberId);
    clubMemberIdsByClub.set(row.clubId, set);
  }

  return { viewerAdminClubIds, viewerStaffClubIds, clubMemberIdsByClub };
}

export async function loadClubMemberNameVisibilityMap(
  userIds: string[]
): Promise<Map<string, ClubMemberNameVisibility>> {
  const map = new Map<string, ClubMemberNameVisibility>();
  if (userIds.length === 0) return map;

  const settings = await prisma.userSettings.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, socialSettings: true },
  });

  for (const row of settings) {
    map.set(
      row.userId,
      clubMemberNameVisibilityFromSocialSettings(row.socialSettings)
    );
  }
  return map;
}

export function resolveClubMemberPublicName(args: {
  viewerId: string;
  target: {
    id: string;
    name: string;
    username?: string | null;
    telegramAccount?: string | null;
  };
  visibility: ClubMemberNameVisibility;
  ctx: ClubMemberNameVisibilityContext;
}): { name: string; nameHidden: boolean } {
  const canSee = canViewerSeeClubMemberName(
    args.visibility,
    args.viewerId,
    args.target.id,
    args.ctx
  );
  if (canSee) {
    return { name: args.target.name, nameHidden: false };
  }
  return {
    name: maskedClubMemberDisplayName(args.target),
    nameHidden: true,
  };
}
