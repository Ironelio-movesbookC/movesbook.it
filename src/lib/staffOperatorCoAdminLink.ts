import { prisma } from '@/lib/prisma';

export const staffListSelect = {
  id: true,
  kind: true,
  username: true,
  name: true,
  surname: true,
  country: true,
  imageUrl: true,
  email: true,
  lastLogin: true,
} as const;

export type StaffListRow = {
  id: string;
  kind: 'OPERATOR' | 'CO_ADMIN';
  username: string;
  name: string;
  surname: string;
  country: string | null;
  imageUrl: string | null;
  email: string;
  lastLogin: Date | null;
};

export function formatStaffLinkAssignmentDate(date: Date | null | undefined): string {
  if (!date) return '—';
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function mapStaffListRow(row: StaffListRow) {
  const fullName = `${row.name} ${row.surname}`.trim() || row.username;
  return {
    id: row.id,
    kind: row.kind,
    username: row.username,
    name: fullName,
    country: row.country ?? '—',
    email: row.email,
    imageUrl: row.imageUrl,
    lastLogin: row.lastLogin
      ? row.lastLogin.toLocaleString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : '—',
  };
}

/** Staff row plus operator↔co-admin link assignment timestamp. */
export function mapStaffLinkAssignmentRow(
  staff: StaffListRow,
  link: { createdAt: Date },
) {
  return {
    ...mapStaffListRow(staff),
    assignmentDate: link.createdAt.toISOString(),
    assignmentDateDisplay: formatStaffLinkAssignmentDate(link.createdAt),
  };
}

export async function getOperatorById(operatorId: string) {
  return prisma.staffAccount.findFirst({
    where: { id: operatorId, kind: 'OPERATOR' },
    select: staffListSelect,
  });
}

export async function getCoAdminById(coAdminId: string) {
  return prisma.staffAccount.findFirst({
    where: { id: coAdminId, kind: 'CO_ADMIN' },
    select: staffListSelect,
  });
}
