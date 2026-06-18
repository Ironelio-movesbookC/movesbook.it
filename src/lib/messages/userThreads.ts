import type { Prisma } from '@prisma/client';

import { prisma } from '@/lib/prisma';

export type UserThreadKind = 'REVIEW' | 'SUPPORT';
export type SupportCategory = 'feedback' | 'question' | 'suggestion' | 'problem';

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
};

export async function listSupportFeed(viewerId: string, filters: SupportFeedFilters) {
  const where: Prisma.UserMessageThreadWhereInput = {
    kind: 'SUPPORT',
    isPublic: true,
    ...(filters.mineOnly ? { userId: viewerId } : {}),
    ...(filters.category ? { supportCategory: filters.category } : {}),
    ...(filters.languageCode ? { languageCode: filters.languageCode } : {}),
    ...(filters.recentOnly
      ? { createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) } }
      : {}),
  };

  const threads = await prisma.userMessageThread.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: 80,
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
  });

  const superAdminNames = await loadSuperAdminNames(threads.map((th) => th.user.superAdminId));

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
      isPublic: isSupport,
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
    (thread.kind === 'SUPPORT' && thread.isPublic);

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
