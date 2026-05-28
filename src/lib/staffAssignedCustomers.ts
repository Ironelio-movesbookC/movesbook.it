import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  alreadyAssignedMessage,
  getAssignmentConflictForTarget,
} from '@/lib/staffUserAssignmentRules';

export type AssignedCustomerRow = {
  assignmentId: string;
  movesbookUserId: string | null;
  username: string;
  name: string;
  country: string;
  language: string;
  lastLogin: string | null;
  lastLoginDisplay: string;
  imageUrl: string | null;
  userTypeLabel: string;
  assignmentDate: string | null;
  assignmentDateDisplay: string;
  source: 'direct' | 'operator';
  viaOperatorId: string | null;
  viaOperatorName: string;
  canRemove: boolean;
};

function formatLastLogin(d: Date | null): { iso: string | null; display: string } {
  if (!d) return { iso: null, display: '—' };
  return {
    iso: d.toISOString(),
    display: d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function formatAssignmentDate(d: Date | null): { iso: string | null; display: string } {
  if (!d) return { iso: null, display: '—' };
  return {
    iso: d.toISOString(),
    display: d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
  };
}

function userTypeLabelFromUserType(userType: UserType | null | undefined): string {
  switch (userType) {
    case UserType.COACH:
      return 'Coach';
    case UserType.TEAM:
    case UserType.TEAM_MANAGER:
      return 'Team';
    case UserType.CLUB:
    case UserType.CLUB_TRAINER:
      return 'Club';
    case UserType.GROUP:
    case UserType.GROUP_ADMIN:
      return 'Group';
    case UserType.ATHLETE:
    default:
      return 'Single User';
  }
}

function mapAssignmentRow(
  r: {
    id: string;
    movesbookUserId: string | null;
    username: string;
    name: string;
    country: string | null;
    language: string | null;
    lastLogin: Date | null;
    imageUrl: string | null;
    createdAt: Date;
  },
  opts: {
    source: 'direct' | 'operator';
    viaOperatorId: string | null;
    viaOperatorName: string;
    canRemove: boolean;
    userTypeLabel: string;
  },
): AssignedCustomerRow {
  const { iso, display } = formatLastLogin(r.lastLogin);
  const { iso: assignIso, display: assignDisplay } = formatAssignmentDate(r.createdAt ?? null);
  return {
    assignmentId: r.id,
    movesbookUserId: r.movesbookUserId,
    username: r.username,
    name: r.name,
    country: r.country ?? '',
    language: r.language ?? '',
    lastLogin: iso,
    lastLoginDisplay: display,
    imageUrl: r.imageUrl,
    userTypeLabel: opts.userTypeLabel,
    assignmentDate: assignIso,
    assignmentDateDisplay: assignDisplay,
    source: opts.source,
    viaOperatorId: opts.viaOperatorId,
    viaOperatorName: opts.viaOperatorName,
    canRemove: opts.canRemove,
  };
}

export type StaffAssignedCustomersOptions = {
  /** Super Admin on a co-admin My Customers page: allow remove on via-operator rows too. */
  adminCanRemoveAllOnCoAdmin?: boolean;
};

export async function getStaffAssignedCustomersPayload(
  staffAccountId: string,
  options: StaffAssignedCustomersOptions = {},
) {
  const staff = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: ['OPERATOR', 'CO_ADMIN'] } },
    select: {
      id: true,
      kind: true,
      username: true,
      name: true,
      surname: true,
    },
  });
  if (!staff) return null;

  const staffName = `${staff.name} ${staff.surname}`.trim() || staff.username;
  const isCoAdmin = staff.kind === 'CO_ADMIN';

  const directRows = await prisma.staffAssignedUser.findMany({
    where: { staffAccountId },
    orderBy: { username: 'asc' },
    select: {
      id: true,
      movesbookUserId: true,
      username: true,
      name: true,
      country: true,
      language: true,
      lastLogin: true,
      imageUrl: true,
      createdAt: true,
    },
  });

  const users: AssignedCustomerRow[] = [];

  const allMovesbookUserIds = Array.from(
    new Set(
      directRows
        .map((r) => r.movesbookUserId)
        .filter((id): id is string => Boolean(id)),
    ),
  );
  const movesbookUserTypeById = new Map<string, UserType>();
  if (allMovesbookUserIds.length > 0) {
    const mbRows = await prisma.user.findMany({
      where: { id: { in: allMovesbookUserIds } },
      select: { id: true, userType: true },
    });
    for (const r of mbRows) movesbookUserTypeById.set(r.id, r.userType);
  }

  if (!isCoAdmin) {
    for (const r of directRows) {
      const userTypeLabel = userTypeLabelFromUserType(
        r.movesbookUserId ? movesbookUserTypeById.get(r.movesbookUserId) : UserType.ATHLETE,
      );
      users.push(
        mapAssignmentRow(r, {
          source: 'direct',
          viaOperatorId: null,
          viaOperatorName: '—',
          canRemove: true,
          userTypeLabel,
        }),
      );
    }

    const coAdminLink = await prisma.staffOperatorCoAdminLink.findUnique({
      where: { operatorId: staffAccountId },
      include: {
        coAdmin: { select: { id: true, username: true, name: true, surname: true } },
      },
    });

    const linkedCoAdmin = coAdminLink?.coAdmin
      ? {
          id: coAdminLink.coAdmin.id,
          name:
            `${coAdminLink.coAdmin.name} ${coAdminLink.coAdmin.surname}`.trim() ||
            coAdminLink.coAdmin.username,
          username: coAdminLink.coAdmin.username,
        }
      : null;

    return {
      staffKind: staff.kind as 'OPERATOR' | 'CO_ADMIN',
      staffName,
      linkedCoAdmin,
      users,
    };
  }

  for (const r of directRows) {
    const userTypeLabel = userTypeLabelFromUserType(
      r.movesbookUserId ? movesbookUserTypeById.get(r.movesbookUserId) : UserType.ATHLETE,
    );
    users.push(
      mapAssignmentRow(r, {
        source: 'direct',
        viaOperatorId: null,
        viaOperatorName: 'Direct association',
        canRemove: true,
        userTypeLabel,
      }),
    );
  }

  const operatorLinks = await prisma.staffOperatorCoAdminLink.findMany({
    where: { coAdminId: staffAccountId },
    include: {
      operator: { select: { id: true, username: true, name: true, surname: true } },
    },
  });

  for (const link of operatorLinks) {
    const opName =
      `${link.operator.name} ${link.operator.surname}`.trim() || link.operator.username;
    const opUsers = await prisma.staffAssignedUser.findMany({
      where: { staffAccountId: link.operatorId },
      orderBy: { username: 'asc' },
      select: {
        id: true,
        movesbookUserId: true,
        username: true,
        name: true,
        country: true,
        language: true,
        lastLogin: true,
        imageUrl: true,
        createdAt: true,
      },
    });
    const opMovesbookIds = Array.from(
      new Set(
        opUsers.map((r) => r.movesbookUserId).filter((id): id is string => Boolean(id)),
      ),
    );
    const opUserTypeById = new Map<string, UserType>();
    if (opMovesbookIds.length > 0) {
      const mbRows = await prisma.user.findMany({
        where: { id: { in: opMovesbookIds } },
        select: { id: true, userType: true },
      });
      for (const r of mbRows) opUserTypeById.set(r.id, r.userType);
    }
    for (const r of opUsers) {
      const userTypeLabel = userTypeLabelFromUserType(
        r.movesbookUserId ? opUserTypeById.get(r.movesbookUserId) : UserType.ATHLETE,
      );
      users.push(
        mapAssignmentRow(r, {
          source: 'operator',
          viaOperatorId: link.operatorId,
          viaOperatorName: opName,
          canRemove: Boolean(options.adminCanRemoveAllOnCoAdmin),
          userTypeLabel,
        }),
      );
    }
  }

  users.sort((a, b) => {
    const via = a.viaOperatorName.localeCompare(b.viaOperatorName);
    if (via !== 0) return via;
    return a.username.localeCompare(b.username);
  });

  return {
    staffKind: staff.kind as 'OPERATOR' | 'CO_ADMIN',
    staffName,
    linkedCoAdmin: null,
    users,
  };
}

export async function assignMovesbookUsersToStaff(
  staffAccountId: string,
  userIds: string[],
): Promise<{ created: number; skipped: number }> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return { created: 0, skipped: 0 };

  const movesbookUsers = await prisma.user.findMany({
    where: {
      id: { in: uniqueIds },
      userType: { in: [UserType.ATHLETE, UserType.COACH] },
    },
    select: {
      id: true,
      username: true,
      name: true,
      firstName: true,
      surname: true,
      country: true,
      image: true,
      lastSeenAt: true,
      settings: { select: { language: true } },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const u of movesbookUsers) {
    const displayName = [u.firstName, u.surname].filter(Boolean).join(' ').trim() || u.name;
    const existing = await prisma.staffAssignedUser.findFirst({
      where: { staffAccountId, movesbookUserId: u.id },
    });
    if (existing) {
      skipped += 1;
      continue;
    }
    const conflict = await getAssignmentConflictForTarget(staffAccountId, u.id);
    if (conflict) {
      skipped += 1;
      continue;
    }
    await prisma.staffAssignedUser.create({
      data: {
        staffAccountId,
        movesbookUserId: u.id,
        username: u.username,
        name: displayName,
        country: u.country,
        language: u.settings?.language ?? 'en',
        lastLogin: u.lastSeenAt,
        imageUrl: u.image,
      },
    });
    created += 1;
  }

  return { created, skipped };
}

export type AssignCandidateRow = {
  id: string;
  username: string;
  name: string;
  country: string;
  language: string;
  lastLoginDisplay: string;
  imageUrl: string | null;
  assignBlocked: boolean;
  existingAssignment: {
    assignmentId: string;
    staffAccountId: string;
    staffName: string;
    staffKind: 'OPERATOR' | 'CO_ADMIN';
    message: string;
  } | null;
};

export async function searchAssignableMovesbookUsers(
  staffAccountId: string,
  search: string,
  limit = 50,
  options: { showBlockedForAdmin?: boolean } = {},
): Promise<AssignCandidateRow[]> {
  const directAssigned = await prisma.staffAssignedUser.findMany({
    where: { staffAccountId, movesbookUserId: { not: null } },
    select: { movesbookUserId: true },
  });
  const alreadyOnTargetIds = new Set(
    directAssigned.map((r) => r.movesbookUserId).filter((id): id is string => Boolean(id)),
  );

  const where = {
    userType: UserType.ATHLETE,
    ...(search
      ? {
          OR: [
            { username: { contains: search } },
            { email: { contains: search } },
            { name: { contains: search } },
            { firstName: { contains: search } },
            { surname: { contains: search } },
          ],
        }
      : {}),
  };

  const rows = await prisma.user.findMany({
    where,
    select: {
      id: true,
      username: true,
      name: true,
      firstName: true,
      surname: true,
      country: true,
      image: true,
      lastSeenAt: true,
      settings: { select: { language: true } },
    },
    orderBy: { username: 'asc' },
    take: limit,
  });

  const results: AssignCandidateRow[] = [];

  for (const u of rows) {
    if (alreadyOnTargetIds.has(u.id)) continue;

    const conflict = await getAssignmentConflictForTarget(staffAccountId, u.id);
    if (conflict && !options.showBlockedForAdmin) continue;

    const displayName = [u.firstName, u.surname].filter(Boolean).join(' ').trim() || u.name;
    const { display } = formatLastLogin(u.lastSeenAt);

    results.push({
      id: u.id,
      username: u.username,
      name: displayName,
      country: u.country ?? '',
      language: u.settings?.language ?? 'en',
      lastLoginDisplay: display,
      imageUrl: u.image,
      assignBlocked: Boolean(conflict),
      existingAssignment: conflict
        ? {
            assignmentId: conflict.assignmentId,
            staffAccountId: conflict.staffAccountId,
            staffName: conflict.staffName,
            staffKind: conflict.staffKind,
            message: alreadyAssignedMessage(conflict),
          }
        : null,
    });
  }

  return results;
}
