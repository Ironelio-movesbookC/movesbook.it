import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

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
  },
  opts: {
    source: 'direct' | 'operator';
    viaOperatorId: string | null;
    viaOperatorName: string;
    canRemove: boolean;
  },
): AssignedCustomerRow {
  const { iso, display } = formatLastLogin(r.lastLogin);
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
    source: opts.source,
    viaOperatorId: opts.viaOperatorId,
    viaOperatorName: opts.viaOperatorName,
    canRemove: opts.canRemove,
  };
}

export async function getStaffAssignedCustomersPayload(staffAccountId: string) {
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
  });

  const users: AssignedCustomerRow[] = [];

  if (!isCoAdmin) {
    for (const r of directRows) {
      users.push(
        mapAssignmentRow(r, {
          source: 'direct',
          viaOperatorId: null,
          viaOperatorName: '—',
          canRemove: true,
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
    users.push(
      mapAssignmentRow(r, {
        source: 'direct',
        viaOperatorId: null,
        viaOperatorName: 'Direct association',
        canRemove: true,
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
    });
    for (const r of opUsers) {
      users.push(
        mapAssignmentRow(r, {
          source: 'operator',
          viaOperatorId: link.operatorId,
          viaOperatorName: opName,
          canRemove: false,
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

export async function searchAssignableMovesbookUsers(
  staffAccountId: string,
  search: string,
  limit = 50,
) {
  const directAssigned = await prisma.staffAssignedUser.findMany({
    where: { staffAccountId, movesbookUserId: { not: null } },
    select: { movesbookUserId: true },
  });
  const excludeIds = directAssigned
    .map((r) => r.movesbookUserId)
    .filter((id): id is string => Boolean(id));

  const where = {
    userType: UserType.ATHLETE,
    ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
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

  return rows.map((u) => {
    const displayName = [u.firstName, u.surname].filter(Boolean).join(' ').trim() || u.name;
    const { display } = formatLastLogin(u.lastSeenAt);
    return {
      id: u.id,
      username: u.username,
      name: displayName,
      country: u.country ?? '',
      language: u.settings?.language ?? 'en',
      lastLoginDisplay: display,
      imageUrl: u.image,
    };
  });
}
