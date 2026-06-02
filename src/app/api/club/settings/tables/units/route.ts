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

type UnitPayload = {
  name: string;
};

type UnitRow = {
  id: string | number | bigint;
  user_id?: string | number | bigint | null;
  club_id?: string | number | bigint | null;
  name?: string | null;
  created?: string | Date | null;
  modified?: string | Date | null;
};

const UNIT_TABLE_CANDIDATES = ['units', 'unit'];
const UNIT_TABLE = 'units';

const UNIT_COLUMN_DEFINITIONS: Record<string, string> = {
  user_id: 'VARCHAR(191) NULL',
  club_id: 'VARCHAR(191) NULL',
  name: 'VARCHAR(250) NOT NULL',
  created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

function text(value: unknown): string {
  return String(value ?? '').trim();
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

async function ensureUnitsTable(): Promise<{ tableName: string; columns: Set<string> }> {
  const existing = await findExistingTable(UNIT_TABLE_CANDIDATES);
  const tableName = existing ?? UNIT_TABLE;

  if (!existing) {
    const columnSql = Object.entries(UNIT_COLUMN_DEFINITIONS)
      .map(([column, definition]) => `\`${column}\` ${definition}`)
      .join(',\n      ');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ${columnSql},
        INDEX idx_units_user_club (user_id, club_id),
        INDEX idx_units_name (name)
      )
    `);
  }

  const columns = await getTableColumns(tableName);
  for (const [column, definition] of Object.entries(UNIT_COLUMN_DEFINITIONS)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${column}\` ${definition}`
      );
      columns.add(column);
    }
  }

  return { tableName, columns };
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

function userFilterClause(columns: Set<string>, context: AuthorizedContext): {
  clause: string;
  params: string[];
} {
  if (!columns.has('user_id')) {
    return { clause: '1=1', params: [] };
  }

  const placeholders = context.userIds.map(() => '?').join(',');
  return {
    clause: `user_id IN (${placeholders})`,
    params: [...context.userIds]
  };
}

function parsePayload(body: unknown): UnitPayload {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return {
    name: text(data.name)
  };
}

function validatePayload(payload: UnitPayload): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!payload.name) {
    fieldErrors.name = 'Please enter unit.';
  } else if (payload.name.length > 250) {
    fieldErrors.name = 'Unit must be 250 characters or fewer.';
  }

  return fieldErrors;
}

async function ensureNoDuplicate(
  tableName: string,
  columns: Set<string>,
  context: AuthorizedContext,
  name: string,
  exceptId?: string
): Promise<boolean> {
  const userFilter = userFilterClause(columns, context);
  const rows = await prisma.$queryRawUnsafe<{ count: number | bigint }[]>(
    `SELECT COUNT(*) AS count
     FROM \`${tableName}\`
     WHERE ${userFilter.clause}
       AND LOWER(TRIM(name)) = LOWER(TRIM(?))
       ${exceptId ? 'AND id <> ?' : ''}`,
    ...userFilter.params,
    name,
    ...(exceptId ? [exceptId] : [])
  );

  return Number(rows[0]?.count ?? 0) === 0;
}

async function assertOwnedUnit(
  tableName: string,
  columns: Set<string>,
  context: AuthorizedContext,
  id: string
): Promise<boolean> {
  const userFilter = userFilterClause(columns, context);
  const rows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT id
     FROM \`${tableName}\`
     WHERE id = ?
       AND ${userFilter.clause}
     LIMIT 1`,
    id,
    ...userFilter.params
  );

  return Boolean(rows[0]);
}

function normalizeUnit(row: UnitRow) {
  return {
    id: String(row.id),
    name: text(row.name),
    created: toIsoDate(row.created),
    modified: toIsoDate(row.modified)
  };
}

function selectColumns(columns: Set<string>): string {
  const fields = ['id', 'name'];
  if (columns.has('user_id')) fields.push('user_id');
  if (columns.has('club_id')) fields.push('club_id');
  if (columns.has('created')) fields.push('created');
  if (columns.has('modified')) fields.push('modified');
  return fields.join(', ');
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const { tableName, columns } = await ensureUnitsTable();
    const userFilter = userFilterClause(columns, context);
    const rows = await prisma.$queryRawUnsafe<UnitRow[]>(
      `SELECT ${selectColumns(columns)}
       FROM \`${tableName}\`
       WHERE ${userFilter.clause}
       ORDER BY id DESC`,
      ...userFilter.params
    );

    return NextResponse.json({
      club: context.club,
      items: rows.map(normalizeUnit)
    });
  } catch (error) {
    console.error('GET /api/club/settings/tables/units:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const { tableName, columns } = await ensureUnitsTable();
    const payload = parsePayload(await request.json());
    const fieldErrors = validatePayload(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(tableName, columns, context, payload.name))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { name: 'This unit already exists.' }
      }, { status: 409 });
    }

    const storageUserId = context.legacyUserId ?? context.userId;
    const insertColumns = ['name'];
    const insertValues: unknown[] = [payload.name];

    if (columns.has('user_id')) {
      insertColumns.unshift('user_id');
      insertValues.unshift(storageUserId);
    }
    if (columns.has('club_id')) {
      insertColumns.push('club_id');
      insertValues.push(context.club?.id ?? null);
    }

    const placeholders = insertColumns.map(() => '?').join(', ');
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\` (${insertColumns.map((column) => `\`${column}\``).join(', ')})
       VALUES (${placeholders})`,
      ...insertValues
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
    console.error('POST /api/club/settings/tables/units:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const { tableName, columns } = await ensureUnitsTable();
    const body = await request.json();
    const id = text((body as Record<string, unknown>)?.id);
    if (!id) {
      return NextResponse.json({ error: 'Unit id is required' }, { status: 400 });
    }

    if (!(await assertOwnedUnit(tableName, columns, context, id))) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    const payload = parsePayload(body);
    const fieldErrors = validatePayload(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(tableName, columns, context, payload.name, id))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { name: 'This unit already exists.' }
      }, { status: 409 });
    }

    const setClauses = ['name = ?'];
    const setValues: unknown[] = [payload.name];
    if (columns.has('modified')) {
      setClauses.push('modified = CURRENT_TIMESTAMP');
    }

    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET ${setClauses.join(', ')}
       WHERE id = ?`,
      ...setValues,
      id
    );

    return NextResponse.json({
      success: true,
      item: { id, ...payload }
    });
  } catch (error) {
    console.error('PUT /api/club/settings/tables/units:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const { tableName, columns } = await ensureUnitsTable();
    const id = text(request.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Unit id is required' }, { status: 400 });
    }

    if (!(await assertOwnedUnit(tableName, columns, context, id))) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM \`${tableName}\` WHERE id = ?`,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/club/settings/tables/units:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
