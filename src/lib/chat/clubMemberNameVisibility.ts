/**
 * Club-member chat: who may see a user's whole display name.
 * Search by username / Telegram ID still works regardless of this setting.
 */
export const CLUB_MEMBER_NAME_VISIBILITY_VALUES = [
  'admin-staff',
  'all-members',
  'hidden',
] as const;

export type ClubMemberNameVisibility =
  (typeof CLUB_MEMBER_NAME_VISIBILITY_VALUES)[number];

export const DEFAULT_CLUB_MEMBER_NAME_VISIBILITY: ClubMemberNameVisibility =
  'admin-staff';

export const CLUB_MEMBER_NAME_VISIBILITY_KEY = 'clubMemberNameVisibility';

export const CLUB_MEMBER_NAME_VISIBILITY_OPTIONS: {
  value: ClubMemberNameVisibility;
  label: string;
}[] = [
  {
    value: 'admin-staff',
    label: 'Put my whole name visible only to club admin and his staff',
  },
  {
    value: 'all-members',
    label: 'Put my whole name visible to all the members of my clubs',
  },
  {
    value: 'hidden',
    label: 'Hide my whole name to all',
  },
];

export function isClubMemberNameVisibility(
  value: unknown
): value is ClubMemberNameVisibility {
  return (
    value === 'admin-staff' ||
    value === 'all-members' ||
    value === 'hidden'
  );
}

export function parseClubMemberNameVisibility(
  value: unknown
): ClubMemberNameVisibility {
  return isClubMemberNameVisibility(value)
    ? value
    : DEFAULT_CLUB_MEMBER_NAME_VISIBILITY;
}

/** Parse from UserSettings.socialSettings JSON string or object. */
export function clubMemberNameVisibilityFromSocialSettings(
  socialSettings: string | Record<string, unknown> | null | undefined
): ClubMemberNameVisibility {
  if (!socialSettings) return DEFAULT_CLUB_MEMBER_NAME_VISIBILITY;
  try {
    const obj =
      typeof socialSettings === 'string'
        ? (JSON.parse(socialSettings) as Record<string, unknown>)
        : socialSettings;
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
      return DEFAULT_CLUB_MEMBER_NAME_VISIBILITY;
    }
    return parseClubMemberNameVisibility(obj[CLUB_MEMBER_NAME_VISIBILITY_KEY]);
  } catch {
    return DEFAULT_CLUB_MEMBER_NAME_VISIBILITY;
  }
}

export function isClubStaffRole(role: string | null | undefined): boolean {
  const r = String(role ?? '').toLowerCase().trim();
  if (!r) return false;
  return (
    r.includes('trainer') ||
    r.includes('operator') ||
    r.includes('staff') ||
    r.includes('employee') ||
    r.includes('coach') ||
    r === 'admin'
  );
}

export type ClubMemberNameVisibilityContext = {
  /** Clubs the viewer administers (Club.adminId). */
  viewerAdminClubIds: ReadonlySet<string>;
  /** Clubs where the viewer has a staff-like ClubMember.role. */
  viewerStaffClubIds: ReadonlySet<string>;
  /** clubId → member user ids (memberships + club owner). */
  clubMemberIdsByClub: ReadonlyMap<string, ReadonlySet<string>>;
};

/**
 * Whether `viewerId` may see `targetId`'s whole name under `visibility`.
 * Assumes the pair already shares a club (club-member audience).
 */
export function canViewerSeeClubMemberName(
  visibility: ClubMemberNameVisibility,
  viewerId: string,
  targetId: string,
  ctx: ClubMemberNameVisibilityContext
): boolean {
  if (viewerId === targetId) return true;
  if (visibility === 'hidden') return false;
  if (visibility === 'all-members') return true;

  // admin-staff: viewer must be admin or staff of a club that includes the target
  for (const clubId of ctx.viewerAdminClubIds) {
    if (ctx.clubMemberIdsByClub.get(clubId)?.has(targetId)) return true;
  }
  for (const clubId of ctx.viewerStaffClubIds) {
    if (ctx.clubMemberIdsByClub.get(clubId)?.has(targetId)) return true;
  }
  return false;
}

/** Public display name when the whole name is hidden. */
export function maskedClubMemberDisplayName(user: {
  username?: string | null;
  telegramAccount?: string | null;
}): string {
  const tg = (user.telegramAccount || '').trim();
  if (tg) return tg.startsWith('@') ? tg : `@${tg}`;
  const username = (user.username || '').trim();
  return username || 'Member';
}
