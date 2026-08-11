import type { Prisma } from '@prisma/client';

/**
 * Who a normal user intends to 1:1 chat with from the Chat panel.
 */
export type ChatAudience =
  | 'movesbook-staff'
  | 'club-admin'
  | 'club-staff'
  | 'club-member'
  | 'movesbook-user';

/** Audiences available in the Chat panel modal. */
export const CHAT_AUDIENCE_OPTIONS: {
  value: ChatAudience;
  label: string;
  description: string;
  enabled: boolean;
}[] = [
  {
    value: 'movesbook-staff',
    label: 'Chatting with Movesbook Staff',
    description: '1:1 chat with Super Administrator accounts that have a Telegram ID',
    enabled: true,
  },
  {
    value: 'club-admin',
    label: 'Chatting with Club Admin',
    description: '1:1 chat with CLUB admins of clubs you belong to (Telegram required)',
    enabled: true,
  },
  {
    value: 'club-staff',
    label: 'Chatting with Club Staff',
    description: '1:1 chat with CLUB accounts that have a Telegram ID',
    enabled: true,
  },
  {
    value: 'club-member',
    label: 'Chatting with Club Member',
    description: '1:1 chat with members of clubs you belong to (Telegram required)',
    enabled: true,
  },
  {
    value: 'movesbook-user',
    label: 'Chatting with Movesbook User',
    description: '1:1 chat with normal user accounts that have a Telegram ID',
    enabled: true,
  },
];

export function isChatAudience(value: unknown): value is ChatAudience {
  return (
    value === 'movesbook-staff' ||
    value === 'club-admin' ||
    value === 'club-staff' ||
    value === 'club-member' ||
    value === 'movesbook-user'
  );
}

/**
 * Prisma filter for peer users eligible for a chat audience.
 * Always combine with `telegramAccount: { not: null }` and exclude self.
 * Returns null when the audience is not implemented yet.
 */
export function buildChatAudienceWhere(
  audience: ChatAudience,
  myId: string
): Prisma.UserWhereInput | null {
  switch (audience) {
    case 'movesbook-staff':
      return { superAdminId: { not: null } };
    case 'movesbook-user':
      return { superAdminId: null };
    case 'club-admin':
      // CLUB accounts that administer a club the current user belongs to
      return {
        userType: 'CLUB',
        ownedClubs: {
          some: {
            members: {
              some: { memberId: myId },
            },
          },
        },
      };
    case 'club-staff':
      // Any CLUB account with Telegram (membership not required)
      return { userType: 'CLUB' };
    case 'club-member':
      // Fellow ClubMember rows on clubs the current user belongs to
      return {
        clubMemberships: {
          some: {
            club: {
              members: {
                some: { memberId: myId },
              },
            },
          },
        },
      };
    default:
      return null;
  }
}

/** Fields needed to evaluate audience match for an already-loaded peer. */
export type ChatAudiencePeerFields = {
  id: string;
  telegramAccount: string | null;
  superAdminId: string | null;
  userType: string;
};

export type ChatAudienceMatchContext = {
  /** adminId values for clubs `myId` belongs to (club-admin) */
  myClubAdminIds?: ReadonlySet<string>;
  /** memberId values sharing a club with `myId` (club-member) */
  myFellowClubMemberIds?: ReadonlySet<string>;
};

/**
 * Whether `other` matches the audience.
 * Pass club context sets when filtering club-admin / club-member conversations.
 */
export function peerMatchesChatAudience(
  audience: ChatAudience,
  other: ChatAudiencePeerFields,
  ctx?: ChatAudienceMatchContext
): boolean {
  if (!other.telegramAccount) return false;

  switch (audience) {
    case 'movesbook-staff':
      return other.superAdminId != null;
    case 'movesbook-user':
      return other.superAdminId == null;
    case 'club-admin':
      return (
        other.userType === 'CLUB' &&
        !!ctx?.myClubAdminIds &&
        ctx.myClubAdminIds.has(other.id)
      );
    case 'club-staff':
      return other.userType === 'CLUB';
    case 'club-member':
      return !!ctx?.myFellowClubMemberIds && ctx.myFellowClubMemberIds.has(other.id);
    default:
      return false;
  }
}
