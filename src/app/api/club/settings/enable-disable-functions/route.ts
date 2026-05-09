import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type EnableDisableSettings = {
  account: boolean;
  membership: boolean;
  cards: boolean;
  subscriptionCostAndDeadline: boolean;
};

type AuthorizedContext = {
  userId: string;
  club: { id: string; name: string } | null;
  userIds: string[];
};

type SettingsRow = {
  id?: string | number | bigint;
  account?: unknown;
  membership?: unknown;
  cards?: unknown;
  subscription_cost_and_deadline?: unknown;
};

const TABLE_NAME = 'club_enable_disable_functions';
const LEGACY_TABLE_CANDIDATES = [
  'club_enable_disable_pages',
  'club_enable_disable_page'
];

const DEFAULT_SETTINGS: EnableDisableSettings = {
  account: false,
  membership: false,
  cards: true,
  subscriptionCostAndDeadline: true
};

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

function getClubKey(clubId: string | null): string {
  return clubId ?? '';
}

function toBooleanFlag(value: unknown): boolean {
  return value === true
    || value === 1
    || value === '1'
    || value === 'Y'
    || value === 'y'
    || value === 'T'
    || value === 't';
}

function toDbFlag(value: boolean): number {
  return value ? 1 : 0;
}

function normalizeSettings(row?: SettingsRow | null): EnableDisableSettings {
  if (!row) return DEFAULT_SETTINGS;
  return {
    account: toBooleanFlag(row.account),
    membership: toBooleanFlag(row.membership),
    cards: toBooleanFlag(row.cards),
    subscriptionCostAndDeadline: toBooleanFlag(row.subscription_cost_and_deadline)
  };
}

async function findExistingTable(candidates: string[]): Promise<string | null> {
  const placeholders = candidates.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );

  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  return candidates.find((candidate) => existing.has(candidate)) ?? null;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    tableName
  );

  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function ensureEnableDisableTable(): Promise<string> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      club_id VARCHAR(191) NULL,
      club_key VARCHAR(191) NOT NULL DEFAULT '',
      account TINYINT(1) NOT NULL DEFAULT 0,
      membership TINYINT(1) NOT NULL DEFAULT 0,
      cards TINYINT(1) NOT NULL DEFAULT 0,
      subscription_cost_and_deadline TINYINT(1) NOT NULL DEFAULT 0,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uniq_club_enable_disable_context (user_id, club_key),
      INDEX idx_club_enable_disable_user_club (user_id, club_id)
    )
  `);

  const requiredColumns: Record<string, string> = {
    user_id: 'VARCHAR(191) NOT NULL',
    club_id: 'VARCHAR(191) NULL',
    club_key: "VARCHAR(191) NOT NULL DEFAULT ''",
    account: 'TINYINT(1) NOT NULL DEFAULT 0',
    membership: 'TINYINT(1) NOT NULL DEFAULT 0',
    cards: 'TINYINT(1) NOT NULL DEFAULT 0',
    subscription_cost_and_deadline: 'TINYINT(1) NOT NULL DEFAULT 0',
    created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  };

  const columns = await getTableColumns(TABLE_NAME);
  for (const [column, definition] of Object.entries(requiredColumns)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${column}\` ${definition}`
      );
    }
  }

  return TABLE_NAME;
}

async function getLegacyUserId(userId: string): Promise<string | null> {
  const fromId = userId.match(/^legacy_(\d+)(?:_|$)/);
  if (fromId?.[1]) return fromId[1];

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id
     FROM \`${mappingTable}\`
     WHERE new_id = ?
       AND legacy_table = 'users'
     ORDER BY legacy_id DESC
     LIMIT 1`,
    userId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name
      FROM clubs_new
      WHERE id = ${requestedClubId}
        AND adminId = ${userId}
      LIMIT 1
    `;
    if (selected[0]) return selected[0];
  }

  const fallback = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name
    FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  return fallback[0] ?? null;
}

async function getAuthorizedContext(request: NextRequest) {
  const decoded = getTokenPayload(request);
  if (!decoded?.userId || !decoded.userType) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isClubAccountUserType(String(decoded.userType))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const userId = String(decoded.userId);
  const requestedClubId = request.nextUrl.searchParams.get('clubId');
  const club = await getOwnedClub(userId, requestedClubId);
  const legacyUserId = await getLegacyUserId(userId);
  const userIds = Array.from(new Set([userId, legacyUserId].filter(Boolean) as string[]));

  return { userId, club, userIds };
}

async function fetchScopedSettings(
  tableName: string,
  context: AuthorizedContext
): Promise<SettingsRow | null> {
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const clubKey = getClubKey(context.club?.id ?? null);

  const rows = await prisma.$queryRawUnsafe<SettingsRow[]>(
    `SELECT id, account, membership, cards, subscription_cost_and_deadline
     FROM \`${tableName}\`
     WHERE user_id IN (${userPlaceholders})
       AND club_key = ?
     ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, modified DESC, id DESC
     LIMIT 1`,
    ...context.userIds,
    clubKey,
    context.userId
  );

  return rows[0] ?? null;
}

async function fetchLegacySettings(context: AuthorizedContext): Promise<SettingsRow | null> {
  const legacyTable = await findExistingTable(LEGACY_TABLE_CANDIDATES);
  if (!legacyTable) return null;

  const columns = await getTableColumns(legacyTable);
  const required = ['account', 'membership', 'cards', 'subscription_cost_and_deadline'];
  if (!required.every((column) => columns.has(column))) return null;

  const orderBy = columns.has('created')
    ? 'created DESC'
    : columns.has('modified')
      ? 'modified DESC'
      : columns.has('id')
        ? 'id DESC'
        : 'account DESC';

  if (columns.has('user_id')) {
    const userPlaceholders = context.userIds.map(() => '?').join(',');
    const clubFilter = columns.has('club_id') && context.club?.id ? ' AND club_id = ?' : '';
    const scopedRows = await prisma.$queryRawUnsafe<SettingsRow[]>(
      `SELECT account, membership, cards, subscription_cost_and_deadline
       FROM \`${legacyTable}\`
       WHERE user_id IN (${userPlaceholders})
         ${clubFilter}
       ORDER BY ${orderBy}
       LIMIT 1`,
      ...context.userIds,
      ...(clubFilter ? [context.club?.id] : [])
    );
    if (scopedRows[0]) return scopedRows[0];
  }

  const rows = await prisma.$queryRawUnsafe<SettingsRow[]>(
    `SELECT account, membership, cards, subscription_cost_and_deadline
     FROM \`${legacyTable}\`
     ORDER BY ${orderBy}
     LIMIT 1`
  );

  return rows[0] ?? null;
}

async function saveSettings(
  tableName: string,
  context: AuthorizedContext,
  settings: EnableDisableSettings
) {
  const clubId = context.club?.id ?? null;
  const clubKey = getClubKey(clubId);

  const existing = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT id
     FROM \`${tableName}\`
     WHERE user_id = ?
       AND club_key = ?
     ORDER BY id DESC
     LIMIT 1`,
    context.userId,
    clubKey
  );

  if (existing[0]) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET club_id = ?,
           account = ?,
           membership = ?,
           cards = ?,
           subscription_cost_and_deadline = ?,
           modified = CURRENT_TIMESTAMP
       WHERE id = ?`,
      clubId,
      toDbFlag(settings.account),
      toDbFlag(settings.membership),
      toDbFlag(settings.cards),
      toDbFlag(settings.subscriptionCostAndDeadline),
      existing[0].id
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${tableName}\`
       (user_id, club_id, club_key, account, membership, cards, subscription_cost_and_deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    context.userId,
    clubId,
    clubKey,
    toDbFlag(settings.account),
    toDbFlag(settings.membership),
    toDbFlag(settings.cards),
    toDbFlag(settings.subscriptionCostAndDeadline)
  );
}

function parseSettingsBody(body: unknown): EnableDisableSettings {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return {
    account: Boolean(data.account),
    membership: Boolean(data.membership),
    cards: Boolean(data.cards),
    subscriptionCostAndDeadline: Boolean(data.subscriptionCostAndDeadline)
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureEnableDisableTable();
    const current = await fetchScopedSettings(tableName, context);

    if (current) {
      return NextResponse.json({
        club: context.club,
        settings: normalizeSettings(current),
        source: 'database'
      });
    }

    const legacy = await fetchLegacySettings(context);
    if (legacy) {
      const settings = normalizeSettings(legacy);
      await saveSettings(tableName, context, settings);

      return NextResponse.json({
        club: context.club,
        settings,
        source: 'legacy'
      });
    }

    return NextResponse.json({
      club: context.club,
      settings: DEFAULT_SETTINGS,
      source: 'default'
    });
  } catch (error) {
    console.error('GET /api/club/settings/enable-disable-functions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const body = await request.json();
    const settings = parseSettingsBody(body);
    const tableName = await ensureEnableDisableTable();
    await saveSettings(tableName, context, settings);

    return NextResponse.json({
      success: true,
      club: context.club,
      settings
    });
  } catch (error) {
    console.error('PUT /api/club/settings/enable-disable-functions:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
