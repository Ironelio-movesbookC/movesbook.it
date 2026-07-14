import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
export type UserThreadKind = 'REVIEW' | 'SUPPORT';
export type SupportCategory = 'feedback' | 'question' | 'suggestion' | 'problem' | 'bug_fixed';

const EXCERPT_LEN = 160;

export function excerptFromBody(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (t.length <= EXCERPT_LEN) return t;
  return `${t.slice(0, EXCERPT_LEN)}…`;
}

function wrapAngle(s: string): string {
  const t = s.trim();
  if (!t) return '< Feedback >';
  if (t.startsWith('<')) return t;
  return `< ${t} >`;
}

const SA_USERNAME_PREFIX = /^sa-/;

type AuthorFields = {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
  superAdminId?: string | null;
};

async function loadSuperAdminNames(ids: Array<string | null | undefined>) {
  const unique = Array.from(new Set(ids.filter((id): id is string => Boolean(id))));
  if (!unique.length) return new Map<string, { name: string | null; username: string }>();
  const rows = await prisma.superAdmin.findMany({
    where: { id: { in: unique } },
    select: { id: true, name: true, username: true },
  });
  return new Map(rows.map((r) => [r.id, r]));
}

function formatAuthor(
  u: AuthorFields,
  superAdminNames: Map<string, { name: string | null; username: string }>,
) {
  if (u.firstName || u.surname) {
    const full = [u.firstName, u.surname].filter(Boolean).join(' ').trim();
    if (full) return full;
  }
  const name = u.name?.trim();
  if (name && !SA_USERNAME_PREFIX.test(name)) return name;
  if (u.superAdminId) {
    const sa = superAdminNames.get(u.superAdminId);
    if (sa) return sa.name?.trim() || sa.username;
  }
  if (u.username && !SA_USERNAME_PREFIX.test(u.username)) return u.username;
  return name || u.username || 'Movesbook user';
}

function senderDisplayName(
  u: { name: string; username: string; superAdminId?: string | null },
  superAdminNames: Map<string, { name: string | null; username: string }>,
) {
  const name = u.name?.trim();
  if (name && !SA_USERNAME_PREFIX.test(name)) return name;
  if (u.superAdminId) {
    const sa = superAdminNames.get(u.superAdminId);
    if (sa) return sa.name?.trim() || sa.username;
  }
  if (u.username && !SA_USERNAME_PREFIX.test(u.username)) return u.username;
  return name || u.username || 'Movesbook user';
}

export type SupportFeedFilters = {
  category?: SupportCategory | '';
  languageCode?: string;
  mineOnly?: boolean;
  recentOnly?: boolean;
  bugsOnly?: boolean;
  excludeBugs?: boolean;
  searchQuery?: string;
  page?: number;
  pageSize?: number;
};

export type PaginatedFeedResult = {
  items: Array<{
    id: string;
    title: string;
    excerpt: string;
    updatedAt: string;
    messageCount: number;
    supportCategory: string | null;
    languageCode: string | null;
    author: string;
    isMine: boolean;
  }>;
  total: number;
  page: number;
  pageSize: number;
};

function buildSearchWhere(q: string): Prisma.UserMessageThreadWhereInput {
  const term = q.trim();
  if (!term) return {};
  return {
    OR: [
      { subject: { contains: term } },
      {
        user: {
          OR: [
            { name: { contains: term } },
            { username: { contains: term } },
            { firstName: { contains: term } },
            { surname: { contains: term } },
          ],
        },
      },
      { messages: { some: { body: { contains: term } } } },
    ],
  };
}

function mapSupportThreads(
  threads: Array<{
    id: string;
    subject: string;
    updatedAt: Date;
    supportCategory: string | null;
    languageCode: string | null;
    userId: string;
    user: AuthorFields & { superAdminId: string | null };
    _count: { messages: number };
    messages: Array<{ body: string }>;
  }>,
  viewerId: string,
  superAdminNames: Map<string, { name: string | null; username: string }>,
) {
  return threads.map((th) => ({
    id: th.id,
    title: wrapAngle(th.subject || 'Feedback'),
    excerpt: th.messages[0] ? excerptFromBody(th.messages[0].body) : '',
    updatedAt: th.updatedAt.toISOString(),
    messageCount: th._count.messages,
    supportCategory: th.supportCategory,
    languageCode: th.languageCode,
    author: formatAuthor(th.user, superAdminNames),
    isMine: th.userId === viewerId,
  }));
}

export async function listSupportFeed(
  viewerId: string,
  filters: SupportFeedFilters,
): Promise<PaginatedFeedResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 5));

  const where: Prisma.UserMessageThreadWhereInput = {
    kind: 'SUPPORT',
    isPublic: true,
    ...(filters.mineOnly ? { userId: viewerId } : {}),
    ...(filters.bugsOnly
      ? {
          supportCategory: 'problem',
          errorMessage: { not: null },
          NOT: { errorMessage: '' },
        }
      : filters.category
        ? {
            supportCategory: filters.category,
            ...(filters.excludeBugs
              ? { OR: [{ errorMessage: null }, { errorMessage: '' }] }
              : {}),
          }
        : {}),
    ...(filters.languageCode ? { languageCode: filters.languageCode } : {}),
    ...(filters.recentOnly
      ? { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } }
      : {}),
    ...buildSearchWhere(filters.searchQuery || ''),
  };

  const [total, threads] = await Promise.all([
    prisma.userMessageThread.count({ where }),
    prisma.userMessageThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            firstName: true,
            surname: true,
            image: true,
            superAdminId: true,
          },
        },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { body: true, createdAt: true },
        },
      },
    }),
  ]);

  const superAdminNames = await loadSuperAdminNames(threads.map((th) => th.user.superAdminId));

  return {
    items: mapSupportThreads(threads, viewerId, superAdminNames),
    total,
    page,
    pageSize,
  };
}

export async function countUserSupportThreads(userId: string): Promise<number> {
  return prisma.userMessageThread.count({
    where: { userId, kind: 'SUPPORT' },
  });
}

export async function listBugFixedMemos(filters: {
  searchQuery?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedFeedResult> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, filters.pageSize ?? 5));

  const where: Prisma.UserMessageThreadWhereInput = {
    kind: 'SUPPORT',
    supportCategory: 'bug_fixed',
    isPublic: false,
    ...buildSearchWhere(filters.searchQuery || ''),
  };

  const [total, threads] = await Promise.all([
    prisma.userMessageThread.count({ where }),
    prisma.userMessageThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            firstName: true,
            surname: true,
            superAdminId: true,
          },
        },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1,
          select: { body: true },
        },
      },
    }),
  ]);

  const superAdminNames = await loadSuperAdminNames(threads.map((th) => th.user.superAdminId));

  return {
    items: threads.map((th) => ({
      id: th.id,
      title: wrapAngle(th.subject || 'Bug fixed'),
      excerpt: th.messages[0] ? excerptFromBody(th.messages[0].body) : '',
      updatedAt: th.updatedAt.toISOString(),
      messageCount: th._count.messages,
      supportCategory: th.supportCategory,
      languageCode: th.languageCode,
      author: formatAuthor(th.user, superAdminNames),
      isMine: true,
    })),
    total,
    page,
    pageSize,
  };
}

export async function listAllReviews(filters?: {
  searchQuery?: string;
  page?: number;
  pageSize?: number;
  userId?: string;
}): Promise<PaginatedFeedResult> {
  const page = Math.max(1, filters?.page ?? 1);
  const pageSize = Math.min(50, Math.max(5, filters?.pageSize ?? 5));

  const where: Prisma.UserMessageThreadWhereInput = {
    kind: 'REVIEW',
    ...(filters?.userId ? { userId: filters.userId } : {}),
    ...buildSearchWhere(filters?.searchQuery || ''),
  };

  const [total, threads] = await Promise.all([
    prisma.userMessageThread.count({ where }),
    prisma.userMessageThread.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        user: {
          select: { firstName: true, surname: true, name: true, username: true, superAdminId: true },
        },
        _count: { select: { messages: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { body: true },
        },
      },
    }),
  ]);

  const superAdminNames = await loadSuperAdminNames(threads.map((th) => th.user.superAdminId));

  return {
    items: threads.map((th) => ({
      id: th.id,
      title: th.subject || 'Review discussion',
      excerpt: th.messages[0] ? excerptFromBody(th.messages[0].body) : '',
      updatedAt: th.updatedAt.toISOString(),
      messageCount: th._count.messages,
      supportCategory: th.supportCategory,
      languageCode: th.languageCode,
      author: formatAuthor(th.user, superAdminNames),
      isMine: false,
    })),
    total,
    page,
    pageSize,
  };
}

export async function listThreadsForUser(userId: string, kind: UserThreadKind) {
  const threads = await prisma.userMessageThread.findMany({
    where: { userId, kind },
    orderBy: { updatedAt: 'desc' },
    include: {
      user: {
        select: { firstName: true, surname: true, name: true, username: true, superAdminId: true },
      },
      _count: { select: { messages: true } },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { body: true },
      },
    },
  });

  const superAdminNames = await loadSuperAdminNames(threads.map((th) => th.user.superAdminId));

  return threads.map((th) => ({
    id: th.id,
    title: th.subject || (kind === 'REVIEW' ? 'Review discussion' : 'Support request'),
    excerpt: th.messages[0] ? excerptFromBody(th.messages[0].body) : '',
    updatedAt: th.updatedAt.toISOString(),
    messageCount: th._count.messages,
    supportCategory: th.supportCategory,
    languageCode: th.languageCode,
    author: formatAuthor(th.user, superAdminNames),
  }));
}

export async function createThreadWithFirstMessage(params: {
  userId: string;
  kind: UserThreadKind;
  subject?: string;
  body: string;
  languageCode?: string;
  pathStaff?: string;
  realPath?: string;
  errorMessage?: string;
  supportCategory?: string;
}) {
  const isSupport = params.kind === 'SUPPORT';
  return prisma.userMessageThread.create({
    data: {
      userId: params.userId,
      kind: params.kind,
      subject: params.subject?.trim() || '',
      languageCode: params.languageCode || null,
      pathStaff: params.pathStaff || null,
      realPath: params.realPath || null,
      errorMessage: params.errorMessage || null,
      supportCategory: params.supportCategory || null,
      isPublic: isSupport && params.supportCategory !== 'bug_fixed',
      messages: {
        create: {
          senderId: params.userId,
          isStaff: false,
          body: params.body.trim(),
        },
      },
    },
    include: { messages: true },
  });
}

export async function getThreadForUser(
  threadId: string,
  viewerId: string,
  isStaff: boolean,
  options?: { allowCommunityReview?: boolean },
) {
  const thread = await prisma.userMessageThread.findUnique({
    where: { id: threadId },
    include: {
      user: {
        select: { firstName: true, surname: true, name: true, username: true, superAdminId: true },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          sender: {
            select: { id: true, name: true, username: true, superAdminId: true },
          },
        },
      },
    },
  });

  if (!thread) return null;

  const isOwner = thread.userId === viewerId;
  const canRead =
    isOwner ||
    isStaff ||
    (thread.kind === 'SUPPORT' && thread.isPublic) ||
    (thread.kind === 'REVIEW' && options?.allowCommunityReview) ||
    (thread.supportCategory === 'bug_fixed' && isStaff);

  if (!canRead) return null;

  const superAdminIds = [
    thread.user.superAdminId,
    ...thread.messages.map((m) => m.sender?.superAdminId),
  ];
  const superAdminNames = await loadSuperAdminNames(superAdminIds);
  const authorName = formatAuthor(thread.user, superAdminNames);

  return {
    thread: {
      id: thread.id,
      subject: thread.subject,
      kind: thread.kind,
      createdAt: thread.createdAt.toISOString(),
      updatedAt: thread.updatedAt.toISOString(),
      isOwner,
      languageCode: thread.languageCode,
      pathStaff: thread.pathStaff,
      supportCategory: thread.supportCategory,
      errorMessage: thread.errorMessage,
      authorName,
    },
    messages: thread.messages.map((m) => ({
      id: m.id,
      body: m.body,
      createdAt: m.createdAt.toISOString(),
      isStaff: m.isStaff,
      sender: m.sender
        ? {
            id: m.sender.id,
            name: senderDisplayName(m.sender, superAdminNames),
            username: m.sender.username,
          }
        : null,
    })),
  };
}

export async function addReplyToThread(params: {
  threadId: string;
  senderId: string | null;
  isStaff: boolean;
  body: string;
}) {
  const thread = await prisma.userMessageThread.findUnique({ where: { id: params.threadId } });
  if (!thread) return null;

  const msg = await prisma.userThreadMessage.create({
    data: {
      threadId: params.threadId,
      senderId: params.senderId,
      isStaff: params.isStaff,
      body: params.body.trim(),
    },
  });

  await prisma.userMessageThread.update({
    where: { id: params.threadId },
    data: { updatedAt: new Date() },
  });

  return msg;
}

export function canReplyToThread(
  thread: { userId: string; kind: string; isPublic: boolean },
  viewerId: string,
  isStaff: boolean,
): boolean {
  if (isStaff) return true;
  if (thread.userId === viewerId) return true;
  if (thread.kind === 'SUPPORT' && thread.isPublic) return true;
  return false;
}
