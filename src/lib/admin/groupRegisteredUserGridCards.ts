import { UserType } from '@prisma/client';
import type { RegisteredUserListRow } from '@/lib/admin/expandRegisteredUserListRows';
import { pickLatestMembershipRowPerEntity } from '@/lib/admin/networkSubscriptionHistory';

export type AdminGridCardGroup = {
  userId: string;
  admin: RegisteredUserListRow;
  entities: RegisteredUserListRow[];
};

/** Preserve API row order — one card per admin account. */
export function groupRowsForAdminGrid(rows: RegisteredUserListRow[]): AdminGridCardGroup[] {
  const order: string[] = [];
  const byUser = new Map<string, RegisteredUserListRow[]>();

  for (const row of rows) {
    if (!byUser.has(row.id)) order.push(row.id);
    const list = byUser.get(row.id) ?? [];
    list.push(row);
    byUser.set(row.id, list);
  }

  return order.map((userId) => {
    const entityRows = byUser.get(userId) ?? [];
    const base = entityRows.find((r) => r.rowKey === userId) ?? entityRows[0]!;
    const owned = entityRows.filter((r) => r.entityId);
    const latestOwned = pickLatestMembershipRowPerEntity(owned);
    return {
      userId,
      admin: base,
      entities: latestOwned.length > 0 ? latestOwned : entityRows,
    };
  });
}

export function gridCardShowsOwnedEntities(group: AdminGridCardGroup): boolean {
  return group.entities.some((e) => Boolean(e.entityId));
}

export function ownedEntitiesLabel(userType: string, count: number): string {
  switch (userType) {
    case UserType.CLUB:
    case UserType.CLUB_TRAINER:
      return `Clubs owned: ${count}`;
    case UserType.TEAM:
    case UserType.TEAM_MANAGER:
      return `Teams owned: ${count}`;
    case UserType.GROUP:
    case UserType.GROUP_ADMIN:
      return `Groups owned: ${count}`;
    case UserType.COACH:
      return `Coaching groups: ${count}`;
    default:
      return `Entities: ${count}`;
  }
}

export function entityCompanyLabel(entityKind?: RegisteredUserListRow['entityKind']): string {
  switch (entityKind) {
    case 'team':
      return 'Team';
    case 'group':
      return 'Group';
    case 'coaching_group':
      return 'Coaching group';
    case 'club':
    default:
      return 'Company';
  }
}
