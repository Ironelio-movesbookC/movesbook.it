import { prisma } from '@/lib/prisma';

export type StaffAssignmentInfo = {
  assignmentId: string;
  staffAccountId: string;
  staffName: string;
  staffKind: 'OPERATOR' | 'CO_ADMIN';
};

export function staffDisplayName(staff: {
  name: string;
  surname: string;
  username: string;
}): string {
  return `${staff.name} ${staff.surname}`.trim() || staff.username;
}

export function staffKindLabel(kind: 'OPERATOR' | 'CO_ADMIN'): string {
  return kind === 'CO_ADMIN' ? 'co-admin' : 'operator';
}

export function alreadyAssignedMessage(conflict: StaffAssignmentInfo): string {
  return `Already assigned to the ${staffKindLabel(conflict.staffKind)} ${conflict.staffName}`;
}

/** Target staff + linked operator/co-admin (same assignment group). */
export async function getAllowedStaffIdsForTarget(staffAccountId: string): Promise<Set<string>> {
  const staff = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: ['OPERATOR', 'CO_ADMIN'] } },
    select: { id: true, kind: true },
  });
  if (!staff) return new Set();

  const allowed = new Set<string>([staffAccountId]);

  if (staff.kind === 'OPERATOR') {
    const link = await prisma.staffOperatorCoAdminLink.findUnique({
      where: { operatorId: staffAccountId },
      select: { coAdminId: true },
    });
    if (link) allowed.add(link.coAdminId);
  } else {
    const links = await prisma.staffOperatorCoAdminLink.findMany({
      where: { coAdminId: staffAccountId },
      select: { operatorId: true },
    });
    for (const l of links) allowed.add(l.operatorId);
  }

  return allowed;
}

export async function getMovesbookUserStaffAssignments(
  movesbookUserId: string,
): Promise<StaffAssignmentInfo[]> {
  const rows = await prisma.staffAssignedUser.findMany({
    where: { movesbookUserId },
    include: {
      staffAccount: {
        select: { id: true, kind: true, name: true, surname: true, username: true },
      },
    },
  });

  return rows.map((r) => ({
    assignmentId: r.id,
    staffAccountId: r.staffAccountId,
    staffName: staffDisplayName(r.staffAccount),
    staffKind: r.staffAccount.kind as 'OPERATOR' | 'CO_ADMIN',
  }));
}

/** Returns blocking assignment on a different staff group, if any. */
export async function getAssignmentConflictForTarget(
  targetStaffAccountId: string,
  movesbookUserId: string,
): Promise<StaffAssignmentInfo | null> {
  const allowed = await getAllowedStaffIdsForTarget(targetStaffAccountId);
  const assignments = await getMovesbookUserStaffAssignments(movesbookUserId);
  for (const a of assignments) {
    if (!allowed.has(a.staffAccountId)) {
      return a;
    }
  }
  return null;
}
