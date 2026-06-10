import { UserType } from '@prisma/client';

export type MembershipEntityKind =
  | 'club'
  | 'team'
  | 'group'
  | 'coaching_group'
  | 'account';

const MEMBERSHIP_ENTITY_KINDS = new Set<MembershipEntityKind>([
  'club',
  'team',
  'group',
  'coaching_group',
  'account',
]);

export function parseMembershipEntityKind(raw: unknown): MembershipEntityKind | null {
  const kind = String(raw ?? '').trim();
  return MEMBERSHIP_ENTITY_KINDS.has(kind as MembershipEntityKind)
    ? (kind as MembershipEntityKind)
    : null;
}

export function entityKindFromUserType(userType: string): MembershipEntityKind {
  switch (userType) {
    case UserType.CLUB:
    case UserType.CLUB_TRAINER:
      return 'club';
    case UserType.TEAM:
    case UserType.TEAM_MANAGER:
      return 'team';
    case UserType.GROUP:
    case UserType.GROUP_ADMIN:
      return 'group';
    case UserType.COACH:
      return 'coaching_group';
    default:
      return 'account';
  }
}

export function entityKindFromAdminSegment(segment: string): MembershipEntityKind | null {
  switch (segment) {
    case 'clubs':
      return 'club';
    case 'teams':
      return 'team';
    case 'groups':
      return 'group';
    case 'coaches':
      return 'coaching_group';
    case 'single-user':
      return 'account';
    default:
      return null;
  }
}

type ListRowEntitySource = {
  rowKey?: string;
  id: string;
  userType: string;
  entityId?: string | null;
  entityKind?: MembershipEntityKind;
  primaryClubId?: string | null;
};

export function inferListRowEntityKind(
  row: ListRowEntitySource,
  segment: string,
): MembershipEntityKind {
  if (row.entityKind) return row.entityKind;
  const key = row.rowKey || '';
  if (key.includes('-club-')) return 'club';
  if (key.includes('-coach-group-')) return 'coaching_group';
  if (key.includes('-team-')) return 'team';
  if (key.includes('-group-')) return 'group';
  const fromSegment = entityKindFromAdminSegment(segment);
  if (fromSegment && fromSegment !== 'account') return fromSegment;
  return entityKindFromUserType(row.userType);
}

function entityIdFromRowKey(rowKey: string, kind: MembershipEntityKind): string | null {
  const patterns: Partial<Record<MembershipEntityKind, RegExp>> = {
    club: /-club-(.+?)(?:-period-|$)/,
    team: /-team-(.+?)(?:-period-|$)/,
    group: /-group-(.+?)(?:-period-|$)/,
    coaching_group: /-coach-group-(.+?)(?:-period-|$)/,
  };
  const pattern = patterns[kind];
  if (!pattern) return null;
  const match = rowKey.match(pattern);
  return match?.[1]?.trim() || null;
}

export function inferListRowEntityId(
  row: ListRowEntitySource,
  kind: MembershipEntityKind,
): string {
  if (kind === 'account') return row.id;
  if (row.entityId?.trim()) return row.entityId.trim();
  if (kind === 'club' && row.primaryClubId?.trim()) return row.primaryClubId.trim();
  const fromKey = entityIdFromRowKey(row.rowKey || '', kind);
  if (fromKey) return fromKey;
  return row.id;
}

export type DescribedMembershipEntity = {
  kind: Exclude<MembershipEntityKind, 'account'>;
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
};

type UserOwnedEntities = {
  id: string;
  ownedClubs: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  }>;
  ownedTeams: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  }>;
  ownedGroups: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  }>;
  ownedCoachingGroups: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt: Date;
  }>;
};

export function findOwnedMembershipEntity(
  user: UserOwnedEntities,
  entityId: string,
  entityKind?: MembershipEntityKind | null,
): DescribedMembershipEntity | null {
  const id = entityId.trim();
  if (!id || id === user.id) return null;

  const tryKind = (kind: Exclude<MembershipEntityKind, 'account'>) => {
    switch (kind) {
      case 'club': {
        const club = user.ownedClubs.find((c) => c.id === id);
        return club ? { kind, ...club } : null;
      }
      case 'team': {
        const team = user.ownedTeams.find((t) => t.id === id);
        return team ? { kind, ...team } : null;
      }
      case 'group': {
        const group = user.ownedGroups.find((g) => g.id === id);
        return group ? { kind, ...group } : null;
      }
      case 'coaching_group': {
        const coaching = user.ownedCoachingGroups.find((g) => g.id === id);
        return coaching ? { kind, ...coaching } : null;
      }
      default:
        return null;
    }
  };

  if (entityKind && entityKind !== 'account') {
    return tryKind(entityKind);
  }

  return (
    tryKind('club') ??
    tryKind('team') ??
    tryKind('group') ??
    tryKind('coaching_group')
  );
}

export function pickPrimaryMembershipEntityId(user: UserOwnedEntities): string {
  const sortedClubs = [...user.ownedClubs].sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
  );
  if (sortedClubs[0]) return sortedClubs[0].id;
  const team = user.ownedTeams[0];
  if (team) return team.id;
  const group = user.ownedGroups[0];
  if (group) return group.id;
  const coaching = user.ownedCoachingGroups[0];
  if (coaching) return coaching.id;
  return user.id;
}
