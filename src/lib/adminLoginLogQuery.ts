import type { Prisma } from '@prisma/client';

export type LoginLogFilterType = 'in' | 'out' | 'both';

export function parseLoginLogDateParam(v: string | null, endOfDay = false): Date | null {
  if (!v || !String(v).trim()) return null;
  const d = new Date(String(v).trim());
  if (Number.isNaN(d.getTime())) return null;
  if (endOfDay) {
    d.setHours(23, 59, 59, 999);
  }
  return d;
}

export function resolveLoginLogDateRange(
  fromParam: string | null,
  toParam: string | null,
): { from: Date; to: Date } {
  let from = parseLoginLogDateParam(fromParam, false);
  let to = parseLoginLogDateParam(toParam, true);
  if (!from || !to) {
    to = new Date();
    to.setHours(23, 59, 59, 999);
    from = new Date(to);
    from.setDate(from.getDate() - 30);
    from.setHours(0, 0, 0, 0);
  }
  return { from, to };
}

export function buildLoginAtDateFilter(
  logType: LoginLogFilterType,
  from: Date,
  to: Date,
): Prisma.StaffAccountLoginLogWhereInput &
  Prisma.SuperAdminLoginLogWhereInput &
  Prisma.UserLoginLogWhereInput {
  if (logType === 'in') {
    return { loginAt: { gte: from, lte: to } };
  }
  if (logType === 'out') {
    return { logoutAt: { gte: from, lte: to } };
  }
  return {
    OR: [
      { loginAt: { gte: from, lte: to } },
      { logoutAt: { gte: from, lte: to } },
    ],
  };
}
