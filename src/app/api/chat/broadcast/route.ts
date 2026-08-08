import { NextRequest, NextResponse } from 'next/server';
import { SportType, UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';
import { readProfilePanelSettings } from '@/lib/admin/userProfilePanelSettings';
import { ALL_COUNTRIES } from '@/constants/countries.constants';
import { readChannelSettings } from '@/lib/chat/channelSettings';
import { resolvePanelAuth } from '@/lib/panelAuth';

export const dynamic = 'force-dynamic';

const BROADCAST_MODES = new Set(['all', 'group', 'subscribers', 'favourites', 'repliers']);
const ALL_SPORT_VALUES = Object.keys(SportType) as SportType[];
const ALL_USER_TYPE_VALUES = (Object.keys(UserType) as UserType[]).filter((t) => t !== 'ADMIN');

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((v) => String(v ?? '').trim()).filter(Boolean))];
}

function isFullSelection(selected: string[], universe: string[]): boolean {
  if (selected.length === 0 || universe.length === 0) return false;
  if (selected.length < universe.length) return false;
  const set = new Set(selected);
  return universe.every((v) => set.has(v));
}

function mapMessage(
  row: {
    id: string;
    content: string;
    mode: string;
    senderName: string;
    createdAt: Date;
    recipientIds: string | null;
  },
  opts?: {
    myId?: string;
    parentById?: Map<string, { content: string; senderName: string }>;
  }
) {
  const isReply = row.mode === 'reply';
  let parentId: string | null = null;
  let senderUserId: string | null = null;
  if (isReply && row.recipientIds) {
    try {
      const meta = JSON.parse(row.recipientIds) as { parentId?: string; senderUserId?: string };
      parentId = typeof meta.parentId === 'string' ? meta.parentId : null;
      senderUserId = typeof meta.senderUserId === 'string' ? meta.senderUserId : null;
    } catch {
      /* ignore */
    }
  }
  const parent = parentId && opts?.parentById ? opts.parentById.get(parentId) : undefined;

  return {
    id: row.id,
    content: row.content,
    mode: row.mode,
    senderName: row.senderName,
    createdAt: row.createdAt.toISOString(),
    isReply,
    isOwn: Boolean(opts?.myId && senderUserId && senderUserId === opts.myId),
    parentId,
    parentContent: parent?.content ?? null,
    parentSenderName: parent?.senderName ?? null,
  };
}

async function resolveRecipientIds(opts: {
  mode: string;
  subscriberIds: string[];
  sports: string[];
  userTypes: string[];
  countries: string[];
}): Promise<string[] | null> {
  const telegramUsers = await prisma.user.findMany({
    where: {
      superAdminId: null,
      telegramAccount: { not: null },
    },
    select: {
      id: true,
      country: true,
      userType: true,
      telegramAccount: true,
      mainSports: { select: { sport: true } },
      settings: { select: { adminSettings: true } },
    },
  });

  const withTelegram = telegramUsers.filter((u) => Boolean(u.telegramAccount?.trim()));

  if (opts.mode === 'all') {
    return null; // visible to every channel viewer
  }

  // Admin "All" chat in Chat users — message every broadcast replier (Telegram).
  if (opts.mode === 'repliers') {
    const set = new Set(opts.subscriberIds);
    return withTelegram.filter((u) => set.has(u.id)).map((u) => u.id);
  }

  if (opts.mode === 'subscribers') {
    const set = new Set(opts.subscriberIds);
    return withTelegram.filter((u) => set.has(u.id)).map((u) => u.id);
  }

  if (opts.mode === 'favourites') {
    return withTelegram
      .filter((u) => {
        const panel = readProfilePanelSettings(u.settings?.adminSettings);
        return panel.favouritePriority !== 'not_selected';
      })
      .map((u) => u.id);
  }

  // group — "select all" on a dimension means unrestricted for that dimension
  const hasFiltersConfigured =
    opts.sports.length > 0 || opts.userTypes.length > 0 || opts.countries.length > 0;
  if (!hasFiltersConfigured) return [];

  const sports = isFullSelection(opts.sports, ALL_SPORT_VALUES) ? [] : (opts.sports as SportType[]);
  const userTypes = isFullSelection(opts.userTypes, ALL_USER_TYPE_VALUES)
    ? []
    : (opts.userTypes as UserType[]);
  const countries = isFullSelection(opts.countries, ALL_COUNTRIES) ? [] : opts.countries;

  if (sports.length === 0 && userTypes.length === 0 && countries.length === 0) {
    return null; // configured group that matches everyone with Telegram
  }

  return withTelegram
    .filter((u) => {
      if (userTypes.length > 0 && !userTypes.includes(u.userType)) return false;
      if (countries.length > 0) {
        const country = (u.country || '').trim();
        if (!country || !countries.includes(country)) return false;
      }
      if (sports.length > 0) {
        const userSports = u.mainSports.map((s) => s.sport);
        if (!sports.some((s) => userSports.includes(s))) return false;
      }
      return true;
    })
    .map((u) => u.id);
}

function userCanSeeBroadcast(
  row: { recipientIds: string | null; mode: string },
  myId: string
): boolean {
  // "repliers" channel chat is only for the targeted broadcast-repliers group.
  if (row.mode === 'repliers') {
    if (!row.recipientIds) return false;
    try {
      const ids = JSON.parse(row.recipientIds) as unknown;
      return Array.isArray(ids) && ids.some((id) => String(id) === myId);
    } catch {
      return false;
    }
  }
  // Other channel posts are a shared feed; recipientIds are for targeting / notifications.
  return true;
}

/** GET - Broadcast messages for Movesbook channel (users) or full history (admin). */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const panelAuth = await resolvePanelAuth(request);
    const isAdmin = panelAuth.ok;
    const wantAll = request.nextUrl.searchParams.get('all') === '1';

    const rows = await prisma.chatBroadcastMessage.findMany({
      orderBy: { createdAt: 'asc' },
      take: 1000,
    });

    const parentById = new Map(
      rows
        .filter((r) => BROADCAST_MODES.has(r.mode))
        .map((r) => [r.id, { content: r.content, senderName: r.senderName }] as const)
    );

    let messages;
    if (isAdmin && wantAll) {
      messages = rows.map((row) => mapMessage(row, { parentById }));
    } else {
      const myId = await resolveMessageDatabaseUserId(decoded.userId, decoded.userType);
      if (!myId) {
        return NextResponse.json({ error: 'User not found' }, { status: 401 });
      }
      messages = rows
        .filter((row) => userCanSeeBroadcast(row, myId))
        .map((row) => mapMessage(row, { myId, parentById }));
    }

    const channelSettings = await readChannelSettings();

    return NextResponse.json({
      channelName: channelSettings.channelName || 'Movesbook channel',
      channelPhoto: channelSettings.photoUrl,
      messages,
      unreadHint: messages.length,
    });
  } catch (error) {
    console.error('Chat broadcast GET:', error);
    return NextResponse.json({ error: 'Failed to load channel messages' }, { status: 500 });
  }
}

/** POST - Admin sends a broadcast into the Movesbook channel (or syncs legacy history). */
export async function POST(request: NextRequest) {
  try {
    const panelAuth = await resolvePanelAuth(request);
    if (!panelAuth.ok) {
      return NextResponse.json({ error: panelAuth.error }, { status: panelAuth.status });
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    // Bulk sync of legacy localStorage history
    if (Array.isArray(body.messages)) {
      const existing = await prisma.chatBroadcastMessage.findMany({
        select: { content: true, mode: true, createdAt: true },
        take: 2000,
      });
      const existingKeys = new Set(
        existing.map(
          (r) => `${r.mode}|${r.content}|${r.createdAt.toISOString()}`
        )
      );

      let createdCount = 0;
      for (const raw of body.messages) {
        if (!raw || typeof raw !== 'object') continue;
        const item = raw as Record<string, unknown>;
        const content = typeof item.content === 'string' ? item.content.trim() : '';
        if (!content) continue;
        const mode =
          typeof item.mode === 'string' && BROADCAST_MODES.has(item.mode.trim())
            ? item.mode.trim()
            : 'all';
        const senderName =
          typeof item.senderName === 'string' && item.senderName.trim()
            ? item.senderName.trim()
            : 'Movesbook admin';
        let createdAt: Date | undefined;
        if (typeof item.createdAt === 'string' && item.createdAt.trim()) {
          const d = new Date(item.createdAt);
          if (!Number.isNaN(d.getTime())) createdAt = d;
        }
        const key = `${mode}|${content}|${(createdAt ?? new Date()).toISOString()}`;
        // Dedupe loosely by content+mode if timestamp key already exists, or content+mode+time
        const looseDup = existing.some((r) => r.mode === mode && r.content === content);
        if (existingKeys.has(key) || looseDup) continue;

        const recipientIds = await resolveRecipientIds({
          mode,
          subscriberIds: asStringArray(item.subscriberIds),
          sports: asStringArray(item.sports),
          userTypes: asStringArray(item.userTypes),
          countries: asStringArray(item.countries),
        });

        // For synced legacy messages without targeting info, treat as channel-wide.
        const storedRecipients =
          mode === 'all' || recipientIds == null
            ? null
            : Array.isArray(recipientIds) && recipientIds.length === 0
              ? null
              : JSON.stringify(recipientIds);

        await prisma.chatBroadcastMessage.create({
          data: {
            content,
            mode,
            senderName,
            recipientIds: storedRecipients,
            ...(createdAt ? { createdAt } : {}),
          },
        });
        createdCount += 1;
      }

      const rows = await prisma.chatBroadcastMessage.findMany({
        orderBy: { createdAt: 'asc' },
        take: 1000,
      });
      return NextResponse.json({
        success: true,
        synced: createdCount,
        messages: rows.map(mapMessage),
      });
    }

    const content = typeof body.content === 'string' ? body.content.trim() : '';
    if (!content) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 });
    }

    const mode = typeof body.mode === 'string' ? body.mode.trim() : 'all';
    if (!BROADCAST_MODES.has(mode)) {
      return NextResponse.json({ error: 'Invalid broadcast mode' }, { status: 400 });
    }

    const senderName =
      typeof body.senderName === 'string' && body.senderName.trim()
        ? body.senderName.trim()
        : 'Movesbook admin';

    const recipientIds = await resolveRecipientIds({
      mode,
      subscriberIds: asStringArray(body.subscriberIds),
      sports: asStringArray(body.sports),
      userTypes: asStringArray(body.userTypes),
      countries: asStringArray(body.countries),
    });

    if (mode !== 'all' && Array.isArray(recipientIds) && recipientIds.length === 0) {
      return NextResponse.json(
        { error: 'No matching recipients for this broadcast' },
        { status: 400 }
      );
    }

    const created = await prisma.chatBroadcastMessage.create({
      data: {
        content,
        mode,
        senderName,
        recipientIds: recipientIds == null ? null : JSON.stringify(recipientIds),
      },
    });

    return NextResponse.json({
      message: mapMessage(created),
      recipientCount: recipientIds == null ? null : recipientIds.length,
    });
  } catch (error) {
    console.error('Chat broadcast POST:', error);
    return NextResponse.json({ error: 'Failed to send broadcast' }, { status: 500 });
  }
}

/** DELETE - Admin clears broadcast history, or deletes one message by id. */
export async function DELETE(request: NextRequest) {
  try {
    const panelAuth = await resolvePanelAuth(request);
    if (!panelAuth.ok) {
      return NextResponse.json({ error: panelAuth.error }, { status: panelAuth.status });
    }

    const messageId = request.nextUrl.searchParams.get('messageId')?.trim();
    if (messageId) {
      const existing = await prisma.chatBroadcastMessage.findUnique({ where: { id: messageId } });
      if (!existing) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 });
      }
      await prisma.chatBroadcastMessage.delete({ where: { id: messageId } });
      return NextResponse.json({ success: true, messageId });
    }

    const mode = request.nextUrl.searchParams.get('mode');
    if (mode && BROADCAST_MODES.has(mode)) {
      await prisma.chatBroadcastMessage.deleteMany({ where: { mode } });
    } else {
      await prisma.chatBroadcastMessage.deleteMany({});
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Chat broadcast DELETE:', error);
    return NextResponse.json({ error: 'Failed to clear broadcast history' }, { status: 500 });
  }
}
