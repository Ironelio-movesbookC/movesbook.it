import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type AuthorizedContext = {
  userId: string;
  legacyUserId: string | null;
  club: { id: string; name: string } | null;
  userIds: string[];
};

type AreaPayload = {
  name: string;
  accessControlEnabled: boolean;
  limitMembers: boolean;
  memberLimit: string;
};

type AreaRow = {
  id: string | number | bigint;
  user_id?: string | number | bigint | null;
  club_id?: string | number | bigint | null;
  area?: string | null;
  is_enable_for_acl?: string | null;
  limit_members?: string | null;
  limit_of_members_at_same_time?: string | number | null;
  created?: string | Date | null;
  modified?: string | Date | null;
};

const AREA_TABLE_CANDIDATES = ['club_setting_areas', 'club_setting_area'];
const TYPOLOGY_TABLE_CANDIDATES = [
  'club_setting_subscription_typologies',
  'club_setting_subscription_typology'
];

const AREA_TABLE = 'club_setting_areas';

const AREA_COLUMN_DEFINITIONS: Record<string, string> = {
  user_id: 'VARCHAR(191) NOT NULL',
  club_id: 'VARCHAR(191) NULL',
  area: 'VARCHAR(191) NOT NULL',
  is_enable_for_acl: "CHAR(1) NOT NULL DEFAULT 'N'",
  limit_members: "CHAR(1) NOT NULL DEFAULT 'N'",
  limit_of_members_at_same_time: 'VARCHAR(50) NULL',
  created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function yesNo(value: unknown): 'Y' | 'N' {
  return value === true
    || value === 1
    || value === '1'
    || value === 'Y'
    || value === 'y'
    || value === 'true'
    ? 'Y'
    : 'N';
}

function isYes(value: unknown): boolean {
  return yesNo(value) === 'Y';
}

function toIsoDate(value: unknown): string | null {
  if (!value) return null;
  const date = new Date(value as string | Date);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
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

async function ensureAreasTable(): Promise<string> {
  const existing = await findExistingTable(AREA_TABLE_CANDIDATES);
  const tableName = existing ?? AREA_TABLE;

  if (!existing) {
    const columnSql = Object.entries(AREA_COLUMN_DEFINITIONS)
      .map(([column, definition]) => `\`${column}\` ${definition}`)
      .join(',\n      ');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ${columnSql},
        INDEX idx_club_setting_areas_user_club (user_id, club_id),
        INDEX idx_club_setting_areas_area (area)
      )
    `);
  }

  const columns = await getTableColumns(tableName);
  for (const [column, definition] of Object.entries(AREA_COLUMN_DEFINITIONS)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${column}\` ${definition}`
      );
    }
  }

  return tableName;
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

  return { userId, legacyUserId, club, userIds };
}

function parsePayload(body: unknown): AreaPayload {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const limitMembers = yesNo(data.limitMembers) === 'Y';

  return {
    name: text(data.name),
    accessControlEnabled: yesNo(data.accessControlEnabled) === 'Y',
    limitMembers,
    memberLimit: limitMembers ? text(data.memberLimit) : ''
  };
}

function validatePayload(payload: AreaPayload): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!payload.name) {
    fieldErrors.name = 'Please enter area name.';
  }

  if (payload.limitMembers) {
    if (!payload.memberLimit) {
      fieldErrors.memberLimit = 'Please enter maximum members.';
    } else if (!/^\d+$/.test(payload.memberLimit) || Number(payload.memberLimit) < 1) {
      fieldErrors.memberLimit = 'Maximum members must be a whole number greater than 0.';
    }
  }

  return fieldErrors;
}

async function ensureNoDuplicate(
  tableName: string,
  context: AuthorizedContext,
  name: string,
  exceptId?: string
): Promise<boolean> {
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ count: number | bigint }[]>(
    `SELECT COUNT(*) AS count
     FROM \`${tableName}\`
     WHERE user_id IN (${userPlaceholders})
       AND LOWER(TRIM(area)) = LOWER(TRIM(?))
       ${exceptId ? 'AND id <> ?' : ''}`,
    ...context.userIds,
    name,
    ...(exceptId ? [exceptId] : [])
  );

  return Number(rows[0]?.count ?? 0) === 0;
}

async function assertOwnedArea(tableName: string, context: AuthorizedContext, id: string): Promise<boolean> {
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT id
     FROM \`${tableName}\`
     WHERE id = ?
       AND user_id IN (${userPlaceholders})
     LIMIT 1`,
    id,
    ...context.userIds
  );

  return Boolean(rows[0]);
}

function normalizeArea(row: AreaRow) {
  return {
    id: String(row.id),
    name: text(row.area),
    accessControlEnabled: isYes(row.is_enable_for_acl),
    limitMembers: isYes(row.limit_members),
    memberLimit: text(row.limit_of_members_at_same_time),
    created: toIsoDate(row.created),
    modified: toIsoDate(row.modified)
  };
}

async function deleteRelatedTypologies(context: AuthorizedContext, areaId: string) {
  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) return;

  const columns = await getTableColumns(typologyTable);
  if (!columns.has('area_activity') || !columns.has('user_id')) return;

  const userPlaceholders = context.userIds.map(() => '?').join(',');
  await prisma.$executeRawUnsafe(
    `DELETE FROM \`${typologyTable}\`
     WHERE user_id IN (${userPlaceholders})
       AND area_activity = ?`,
    ...context.userIds,
    areaId
  );
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureAreasTable();
    const sort = request.nextUrl.searchParams.get('sort');
    const orderBy = sort === 'alpha' ? 'area ASC, id ASC' : 'id DESC';
    const userPlaceholders = context.userIds.map(() => '?').join(',');
    const rows = await prisma.$queryRawUnsafe<AreaRow[]>(
      `SELECT id, user_id, club_id, area, is_enable_for_acl, limit_members,
              limit_of_members_at_same_time, created, modified
       FROM \`${tableName}\`
       WHERE user_id IN (${userPlaceholders})
       ORDER BY ${orderBy}`,
      ...context.userIds
    );

    return NextResponse.json({
      club: context.club,
      items: rows.map(normalizeArea)
    });
  } catch (error) {
    console.error('GET /api/club/settings/tables/areas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureAreasTable();
    const payload = parsePayload(await request.json());
    const fieldErrors = validatePayload(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(tableName, context, payload.name))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { name: 'This area already exists.' }
      }, { status: 409 });
    }

    const storageUserId = context.legacyUserId ?? context.userId;
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\`
         (user_id, club_id, area, is_enable_for_acl, limit_members, limit_of_members_at_same_time)
       VALUES (?, ?, ?, ?, ?, ?)`,
      storageUserId,
      context.club?.id ?? null,
      payload.name,
      yesNo(payload.accessControlEnabled),
      yesNo(payload.limitMembers),
      payload.memberLimit
    );

    const idRows = await prisma.$queryRawUnsafe<{ id: bigint | number | string }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );

    return NextResponse.json({
      success: true,
      item: {
        id: String(idRows[0]?.id ?? ''),
        ...payload
      }
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/club/settings/tables/areas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureAreasTable();
    const body = await request.json();
    const id = text((body as Record<string, unknown>)?.id);
    if (!id) {
      return NextResponse.json({ error: 'Area id is required' }, { status: 400 });
    }

    if (!(await assertOwnedArea(tableName, context, id))) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 });
    }

    const payload = parsePayload(body);
    const fieldErrors = validatePayload(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(tableName, context, payload.name, id))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { name: 'This area already exists.' }
      }, { status: 409 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET area = ?,
           is_enable_for_acl = ?,
           limit_members = ?,
           limit_of_members_at_same_time = ?,
           modified = CURRENT_TIMESTAMP
       WHERE id = ?`,
      payload.name,
      yesNo(payload.accessControlEnabled),
      yesNo(payload.limitMembers),
      payload.memberLimit,
      id
    );

    return NextResponse.json({
      success: true,
      item: { id, ...payload }
    });
  } catch (error) {
    console.error('PUT /api/club/settings/tables/areas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureAreasTable();
    const id = text(request.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Area id is required' }, { status: 400 });
    }

    if (!(await assertOwnedArea(tableName, context, id))) {
      return NextResponse.json({ error: 'Area not found' }, { status: 404 });
    }

    await deleteRelatedTypologies(context, id);
    await prisma.$executeRawUnsafe(
      `DELETE FROM \`${tableName}\` WHERE id = ?`,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/club/settings/tables/areas:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
