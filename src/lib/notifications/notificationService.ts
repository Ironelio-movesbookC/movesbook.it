import type { Notification, UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  expandStaffAudienceRoles,
  isClubAudienceKind,
  isStaffAudienceRole,
  parseJsonStringArray,
  parseUsernameInput,
  toJsonStringArray,
  type ClubAudienceKind,
  type NotificationSource,
  type StaffAudienceRole,
} from '@/lib/notifications/audience';

export type NotificationDto = {
  id: string;
  source: NotificationSource;
  title: string;
  description: string;
  path: string | null;
  untilDate: string;
  langId: string | null;
  prioritary: boolean;
  isShow: boolean;
  audienceRoles: string[];
  audienceUsernames: string[];
  audienceUserIds: string[];
  clubIds: string[];
  audienceKind: ClubAudienceKind;
  submittedByUserId: string | null;
  submittedByAdminId: string | null;
  submittedByName: string | null;
  submittedByUsername: string | null;
  submittedByImage: string | null;
  createdAt: string;
  visited: boolean;
};

function startOfTodayUtc(): Date {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function toDateOnly(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) throw new Error('Invalid untilDate');
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function formatDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function mapRow(
  row: Notification & {
    submittedByUser?: {
      id: string;
      name: string;
      username: string;
      image: string | null;
    } | null;
  },
  visitedIds?: Set<string>
): NotificationDto {
  return {
    id: row.id,
    source: row.source as NotificationSource,
    title: row.title,
    description: row.description,
    path: row.path,
    untilDate: formatDateOnly(row.untilDate),
    langId: row.langId,
    prioritary: row.prioritary,
    isShow: row.isShow,
    audienceRoles: parseJsonStringArray(row.audienceRolesJson),
    audienceUsernames: parseJsonStringArray(row.audienceUsernamesJson),
    audienceUserIds: parseJsonStringArray(row.audienceUserIdsJson),
    clubIds: parseJsonStringArray(row.clubIdsJson),
    audienceKind: isClubAudienceKind(row.audienceKind) ? row.audienceKind : 'members',
    submittedByUserId: row.submittedByUserId,
    submittedByAdminId: row.submittedByAdminId,
    submittedByName: row.submittedByUser?.name ?? null,
    submittedByUsername: row.submittedByUser?.username ?? null,
    submittedByImage: row.submittedByUser?.image ?? null,
    createdAt: row.createdAt.toISOString(),
    visited: visitedIds ? visitedIds.has(row.id) : false,
  };
}

async function resolveUsernamesToIds(usernames: string[]): Promise<{ userIds: string[]; missing: string[] }> {
  if (usernames.length === 0) return { userIds: [], missing: [] };
  const users = await prisma.user.findMany({
    where: { username: { in: usernames } },
    select: { id: true, username: true },
  });
  const found = new Map(users.map((u) => [u.username.toLowerCase(), u.id]));
  const userIds: string[] = [];
  const missing: string[] = [];
  for (const name of usernames) {
    const id = found.get(name.toLowerCase());
    if (id) userIds.push(id);
    else missing.push(name);
  }
  return { userIds, missing };
}

export type CreateStaffNotificationInput = {
  title: string;
  description: string;
  path?: string;
  untilDate: string;
  langId?: string | null;
  prioritary?: boolean;
  audienceRoles?: string[];
  usernamesRaw?: string;
  submittedByAdminId: string;
  submittedByUserId?: string | null;
  editId?: string;
};

export async function createOrUpdateStaffNotification(input: CreateStaffNotificationInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) throw new Error('Object (title) is required');
  if (!description) throw new Error('Message is required');

  const roles = (input.audienceRoles ?? []).filter(isStaffAudienceRole) as StaffAudienceRole[];
  const usernames = parseUsernameInput(input.usernamesRaw ?? '');
  if (roles.length === 0 && usernames.length === 0) {
    throw new Error('Select recipient roles and/or type at least one username');
  }

  const { userIds, missing } = await resolveUsernamesToIds(usernames);
  if (missing.length > 0) {
    throw new Error(`Unknown username(s): ${missing.join(', ')}`);
  }

  const data = {
    source: 'movesbook_staff' as const,
    title,
    description,
    path: input.path?.trim() || null,
    untilDate: toDateOnly(input.untilDate),
    langId: !input.langId || input.langId === '0' ? '0' : String(input.langId),
    prioritary: Boolean(input.prioritary),
    isShow: true,
    submittedByAdminId: input.submittedByAdminId,
    submittedByUserId: input.submittedByUserId ?? null,
    audienceRolesJson: toJsonStringArray(roles),
    audienceUsernamesJson: toJsonStringArray(usernames),
    audienceUserIdsJson: toJsonStringArray(userIds),
    clubIdsJson: '[]',
    audienceKind: 'members',
  };

  if (input.editId) {
    const existing = await prisma.notification.findFirst({
      where: { id: input.editId, source: 'movesbook_staff' },
    });
    if (!existing) throw new Error('Notification not found');
    return prisma.notification.update({ where: { id: input.editId }, data });
  }

  return prisma.notification.create({ data });
}

export type CreateClubNotificationInput = {
  title: string;
  description: string;
  path?: string;
  untilDate: string;
  prioritary?: boolean;
  audienceKind?: ClubAudienceKind;
  /** One club (MY CLUB) or many (MY PAGE — all owned). */
  clubIds: string[];
  submittedByUserId: string;
  editId?: string;
};

export async function createOrUpdateClubNotification(input: CreateClubNotificationInput) {
  const title = input.title.trim();
  const description = input.description.trim();
  if (!title) throw new Error('Object (title) is required');
  if (!description) throw new Error('Message is required');

  const clubIds = Array.from(new Set(input.clubIds.map((id) => id.trim()).filter(Boolean)));
  if (clubIds.length === 0) throw new Error('No club selected');

  const owned = await prisma.club.findMany({
    where: { id: { in: clubIds }, adminId: input.submittedByUserId },
    select: { id: true },
  });
  if (owned.length !== clubIds.length) {
    throw new Error('You can only notify members of clubs you own');
  }

  const audienceKind: ClubAudienceKind = isClubAudienceKind(input.audienceKind)
    ? input.audienceKind
    : 'members';

  const data = {
    source: 'club_admin' as const,
    title,
    description,
    path: input.path?.trim() || null,
    untilDate: toDateOnly(input.untilDate),
    langId: '0',
    prioritary: Boolean(input.prioritary),
    isShow: true,
    submittedByUserId: input.submittedByUserId,
    submittedByAdminId: null,
    audienceRolesJson: '[]',
    audienceUsernamesJson: '[]',
    audienceUserIdsJson: '[]',
    clubIdsJson: toJsonStringArray(clubIds),
    audienceKind,
  };

  if (input.editId) {
    const existing = await prisma.notification.findFirst({
      where: { id: input.editId, source: 'club_admin', submittedByUserId: input.submittedByUserId },
    });
    if (!existing) throw new Error('Notification not found');
    return prisma.notification.update({ where: { id: input.editId }, data });
  }

  return prisma.notification.create({ data });
}

export async function listStaffNotifications(params: {
  search?: string;
  roleFilter?: string;
  recentOnly?: boolean;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 10));
  const where: Record<string, unknown> = { source: 'movesbook_staff' };

  if (params.search?.trim()) {
    where.title = { contains: params.search.trim() };
  }
  if (params.roleFilter && isStaffAudienceRole(params.roleFilter)) {
    where.audienceRolesJson = { contains: `"${params.roleFilter}"` };
  }
  if (params.recentOnly) {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    where.createdAt = { gte: threeMonthsAgo };
  }

  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ prioritary: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        submittedByUser: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => mapRow(r)),
    total,
    page,
    pageSize,
  };
}

export async function listClubAdminSentNotifications(params: {
  userId: string;
  clubId?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 10));
  const where: Record<string, unknown> = {
    source: 'club_admin',
    submittedByUserId: params.userId,
  };
  if (params.search?.trim()) {
    where.title = { contains: params.search.trim() };
  }
  if (params.clubId?.trim()) {
    where.clubIdsJson = { contains: params.clubId.trim() };
  }

  const [total, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.findMany({
      where,
      orderBy: [{ prioritary: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        submittedByUser: { select: { id: true, name: true, username: true, image: true } },
      },
    }),
  ]);

  return {
    items: rows.map((r) => mapRow(r)),
    total,
    page,
    pageSize,
  };
}

function staffMatchesUser(
  row: Notification,
  user: { id: string; username: string; userType: UserType }
): boolean {
  const userIds = parseJsonStringArray(row.audienceUserIdsJson);
  if (userIds.includes(user.id)) return true;

  const usernames = parseJsonStringArray(row.audienceUsernamesJson).map((u) => u.toLowerCase());
  if (usernames.includes(user.username.toLowerCase())) return true;

  const roles = parseJsonStringArray(row.audienceRolesJson);
  const expanded = expandStaffAudienceRoles(roles);
  return expanded.includes(user.userType);
}

export async function listInboxForUser(params: {
  userId: string;
  source: 'movesbook' | 'clubs';
  search?: string;
  page?: number;
  pageSize?: number;
  activeOnly?: boolean;
}) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, params.pageSize ?? 10));
  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { id: true, username: true, userType: true },
  });
  if (!user) throw new Error('User not found');

  const today = startOfTodayUtc();
  const activeOnly = params.activeOnly !== false;

  if (params.source === 'movesbook') {
    const where: Record<string, unknown> = {
      source: 'movesbook_staff',
      ...(activeOnly ? { isShow: true, untilDate: { gte: today } } : {}),
    };
    if (params.search?.trim()) where.title = { contains: params.search.trim() };

    const candidates = await prisma.notification.findMany({
      where,
      orderBy: [{ prioritary: 'desc' }, { createdAt: 'desc' }],
      include: {
        submittedByUser: { select: { id: true, name: true, username: true, image: true } },
      },
      take: 500,
    });

    const matched = candidates.filter((row) => staffMatchesUser(row, user));
    const slice = matched.slice((page - 1) * pageSize, page * pageSize);
    const visited = await loadVisitedSet(
      user.id,
      slice.map((r) => r.id)
    );

    return {
      items: slice.map((r) => mapRow(r, visited)),
      total: matched.length,
      page,
      pageSize,
    };
  }

  // Club notifications: membership / staff based on audienceKind + clubIds
  const memberships = await prisma.clubMember.findMany({
    where: { memberId: user.id },
    select: { clubId: true },
  });
  const staffRoles = await prisma.clubStaff.findMany({
    where: { userId: user.id },
    select: { clubId: true },
  });
  const memberClubIds = new Set(memberships.map((m) => m.clubId));
  const staffClubIds = new Set(staffRoles.map((s) => s.clubId));

  if (memberClubIds.size === 0 && staffClubIds.size === 0) {
    return { items: [], total: 0, page, pageSize };
  }

  const where: Record<string, unknown> = {
    source: 'club_admin',
    ...(activeOnly ? { isShow: true, untilDate: { gte: today } } : {}),
  };
  if (params.search?.trim()) where.title = { contains: params.search.trim() };

  const candidates = await prisma.notification.findMany({
    where,
    orderBy: [{ prioritary: 'desc' }, { createdAt: 'desc' }],
    include: {
      submittedByUser: { select: { id: true, name: true, username: true, image: true } },
    },
    take: 500,
  });

  const matched = candidates.filter((row) => {
    const clubIds = parseJsonStringArray(row.clubIdsJson);
    if (clubIds.length === 0) return false;
    const kind = isClubAudienceKind(row.audienceKind) ? row.audienceKind : 'members';
    if (kind === 'staff') {
      return clubIds.some((id) => staffClubIds.has(id));
    }
    return clubIds.some((id) => memberClubIds.has(id));
  });

  const slice = matched.slice((page - 1) * pageSize, page * pageSize);
  const visited = await loadVisitedSet(
    user.id,
    slice.map((r) => r.id)
  );

  return {
    items: slice.map((r) => mapRow(r, visited)),
    total: matched.length,
    page,
    pageSize,
  };
}

async function loadVisitedSet(userId: string, notificationIds: string[]): Promise<Set<string>> {
  if (notificationIds.length === 0) return new Set();
  const rows = await prisma.notificationVisit.findMany({
    where: { userId, notificationId: { in: notificationIds } },
    select: { notificationId: true },
  });
  return new Set(rows.map((r) => r.notificationId));
}

export async function markNotificationVisited(userId: string, notificationId: string) {
  await prisma.notificationVisit.upsert({
    where: {
      notificationId_userId: { notificationId, userId },
    },
    create: { notificationId, userId },
    update: {},
  });
}

export async function getUnreadCounts(userId: string): Promise<{
  movesbook: number;
  clubs: number;
  total: number;
}> {
  const [movesbook, clubs] = await Promise.all([
    listInboxForUser({ userId, source: 'movesbook', page: 1, pageSize: 500 }),
    listInboxForUser({ userId, source: 'clubs', page: 1, pageSize: 500 }),
  ]);
  const movesbookUnread = movesbook.items.filter((i) => !i.visited).length;
  const clubsUnread = clubs.items.filter((i) => !i.visited).length;
  return {
    movesbook: movesbookUnread,
    clubs: clubsUnread,
    total: movesbookUnread + clubsUnread,
  };
}

export async function toggleNotificationVisibility(id: string, isShow: boolean, source?: NotificationSource) {
  const where: { id: string; source?: string } = { id };
  if (source) where.source = source;
  return prisma.notification.update({ where: { id }, data: { isShow } });
}

export async function deleteNotification(id: string, opts?: { source?: NotificationSource; submittedByUserId?: string }) {
  const where: Record<string, unknown> = { id };
  if (opts?.source) where.source = opts.source;
  if (opts?.submittedByUserId) where.submittedByUserId = opts.submittedByUserId;
  const existing = await prisma.notification.findFirst({ where });
  if (!existing) throw new Error('Not found');
  await prisma.notification.delete({ where: { id } });
}

export async function getNotificationById(id: string) {
  const row = await prisma.notification.findUnique({
    where: { id },
    include: {
      submittedByUser: { select: { id: true, name: true, username: true, image: true } },
    },
  });
  return row ? mapRow(row) : null;
}
