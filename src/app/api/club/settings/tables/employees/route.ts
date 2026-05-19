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

type EmployeeOccupationPayload = {
  name: string;
};

type EmployeeOccupationRow = {
  id: string | number | bigint;
  user_id?: string | number | bigint | null;
  club_id?: string | number | bigint | null;
  occupation?: string | null;
  created?: string | Date | null;
  modified?: string | Date | null;
};

const EMPLOYEE_OCCUPATION_TABLE_CANDIDATES = [
  'club_setting_emp_occupations',
  'club_setting_emp_occupation'
];
const EMPLOYEE_OCCUPATION_TABLE = 'club_setting_emp_occupations';

const EMPLOYEE_OCCUPATION_COLUMN_DEFINITIONS: Record<string, string> = {
  user_id: 'VARCHAR(191) NOT NULL',
  club_id: 'VARCHAR(191) NULL',
  occupation: 'VARCHAR(250) NOT NULL',
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

async function ensureEmployeeOccupationsTable(): Promise<string> {
  const existing = await findExistingTable(EMPLOYEE_OCCUPATION_TABLE_CANDIDATES);
  const tableName = existing ?? EMPLOYEE_OCCUPATION_TABLE;

  if (!existing) {
    const columnSql = Object.entries(EMPLOYEE_OCCUPATION_COLUMN_DEFINITIONS)
      .map(([column, definition]) => `\`${column}\` ${definition}`)
      .join(',\n      ');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ${columnSql},
        INDEX idx_club_setting_emp_occupations_user_club (user_id, club_id),
        INDEX idx_club_setting_emp_occupations_occupation (occupation)
      )
    `);
  }

  const columns = await getTableColumns(tableName);
  for (const [column, definition] of Object.entries(EMPLOYEE_OCCUPATION_COLUMN_DEFINITIONS)) {
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

function parsePayload(body: unknown): EmployeeOccupationPayload {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return {
    name: text(data.name)
  };
}

function validatePayload(payload: EmployeeOccupationPayload): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!payload.name) {
    fieldErrors.name = 'Please enter occupation.';
  } else if (payload.name.length > 250) {
    fieldErrors.name = 'Occupation must be 250 characters or fewer.';
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
       AND LOWER(TRIM(occupation)) = LOWER(TRIM(?))
       ${exceptId ? 'AND id <> ?' : ''}`,
    ...context.userIds,
    name,
    ...(exceptId ? [exceptId] : [])
  );

  return Number(rows[0]?.count ?? 0) === 0;
}

async function assertOwnedEmployeeOccupation(
  tableName: string,
  context: AuthorizedContext,
  id: string
): Promise<boolean> {
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

function normalizeEmployeeOccupation(row: EmployeeOccupationRow) {
  return {
    id: String(row.id),
    name: text(row.occupation),
    created: toIsoDate(row.created),
    modified: toIsoDate(row.modified)
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureEmployeeOccupationsTable();
    const userPlaceholders = context.userIds.map(() => '?').join(',');
    const rows = await prisma.$queryRawUnsafe<EmployeeOccupationRow[]>(
      `SELECT id, user_id, club_id, occupation, created, modified
       FROM \`${tableName}\`
       WHERE user_id IN (${userPlaceholders})
       ORDER BY id DESC`,
      ...context.userIds
    );

    return NextResponse.json({
      club: context.club,
      items: rows.map(normalizeEmployeeOccupation)
    });
  } catch (error) {
    console.error('GET /api/club/settings/tables/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureEmployeeOccupationsTable();
    const payload = parsePayload(await request.json());
    const fieldErrors = validatePayload(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(tableName, context, payload.name))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { name: 'This occupation already exists.' }
      }, { status: 409 });
    }

    const storageUserId = context.legacyUserId ?? context.userId;
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\` (user_id, club_id, occupation)
       VALUES (?, ?, ?)`,
      storageUserId,
      context.club?.id ?? null,
      payload.name
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
    console.error('POST /api/club/settings/tables/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureEmployeeOccupationsTable();
    const body = await request.json();
    const id = text((body as Record<string, unknown>)?.id);
    if (!id) {
      return NextResponse.json({ error: 'Occupation id is required' }, { status: 400 });
    }

    if (!(await assertOwnedEmployeeOccupation(tableName, context, id))) {
      return NextResponse.json({ error: 'Occupation not found' }, { status: 404 });
    }

    const payload = parsePayload(body);
    const fieldErrors = validatePayload(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(tableName, context, payload.name, id))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { name: 'This occupation already exists.' }
      }, { status: 409 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET occupation = ?,
           modified = CURRENT_TIMESTAMP
       WHERE id = ?`,
      payload.name,
      id
    );

    return NextResponse.json({
      success: true,
      item: { id, ...payload }
    });
  } catch (error) {
    console.error('PUT /api/club/settings/tables/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureEmployeeOccupationsTable();
    const id = text(request.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Occupation id is required' }, { status: 400 });
    }

    if (!(await assertOwnedEmployeeOccupation(tableName, context, id))) {
      return NextResponse.json({ error: 'Occupation not found' }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM \`${tableName}\` WHERE id = ?`,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/club/settings/tables/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
