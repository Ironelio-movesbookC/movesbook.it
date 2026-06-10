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

type ContactPayload = {
  name: string;
};

type ContactRow = {
  id: string | number | bigint;
  user_id?: string | number | bigint | null;
  club_id?: string | number | bigint | null;
  contacts?: string | null;
  created?: string | Date | null;
  modified?: string | Date | null;
};

const CONTACT_TABLE_CANDIDATES = ['club_setting_contacts', 'club_setting_contact'];
const CONTACT_TABLE = 'club_setting_contacts';

const CONTACT_COLUMN_DEFINITIONS: Record<string, string> = {
  user_id: 'VARCHAR(191) NOT NULL',
  club_id: 'VARCHAR(191) NULL',
  contacts: 'VARCHAR(250) NOT NULL',
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

async function ensureContactsTable(): Promise<string> {
  const existing = await findExistingTable(CONTACT_TABLE_CANDIDATES);
  const tableName = existing ?? CONTACT_TABLE;

  if (!existing) {
    const columnSql = Object.entries(CONTACT_COLUMN_DEFINITIONS)
      .map(([column, definition]) => `\`${column}\` ${definition}`)
      .join(',\n      ');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ${columnSql},
        INDEX idx_club_setting_contacts_user_club (user_id, club_id),
        INDEX idx_club_setting_contacts_contacts (contacts)
      )
    `);
  }

  const columns = await getTableColumns(tableName);
  for (const [column, definition] of Object.entries(CONTACT_COLUMN_DEFINITIONS)) {
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

function parsePayload(body: unknown): ContactPayload {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  return {
    name: text(data.name)
  };
}

function validatePayload(payload: ContactPayload): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  if (!payload.name) {
    fieldErrors.name = 'Please enter contact.';
  } else if (payload.name.length > 250) {
    fieldErrors.name = 'Contact must be 250 characters or fewer.';
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
       AND LOWER(TRIM(contacts)) = LOWER(TRIM(?))
       ${exceptId ? 'AND id <> ?' : ''}`,
    ...context.userIds,
    name,
    ...(exceptId ? [exceptId] : [])
  );

  return Number(rows[0]?.count ?? 0) === 0;
}

async function assertOwnedContact(
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

function normalizeContact(row: ContactRow) {
  return {
    id: String(row.id),
    name: text(row.contacts),
    created: toIsoDate(row.created),
    modified: toIsoDate(row.modified)
  };
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureContactsTable();
    const userPlaceholders = context.userIds.map(() => '?').join(',');
    const rows = await prisma.$queryRawUnsafe<ContactRow[]>(
      `SELECT id, user_id, club_id, contacts, created, modified
       FROM \`${tableName}\`
       WHERE user_id IN (${userPlaceholders})
       ORDER BY id DESC`,
      ...context.userIds
    );

    return NextResponse.json({
      club: context.club,
      items: rows.map(normalizeContact)
    });
  } catch (error) {
    console.error('GET /api/club/settings/tables/contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureContactsTable();
    const payload = parsePayload(await request.json());
    const fieldErrors = validatePayload(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(tableName, context, payload.name))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { name: 'This contact already exists.' }
      }, { status: 409 });
    }

    const storageUserId = context.legacyUserId ?? context.userId;
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\` (user_id, club_id, contacts)
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
    console.error('POST /api/club/settings/tables/contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureContactsTable();
    const body = await request.json();
    const id = text((body as Record<string, unknown>)?.id);
    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    if (!(await assertOwnedContact(tableName, context, id))) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const payload = parsePayload(body);
    const fieldErrors = validatePayload(payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(tableName, context, payload.name, id))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { name: 'This contact already exists.' }
      }, { status: 409 });
    }

    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET contacts = ?,
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
    console.error('PUT /api/club/settings/tables/contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureContactsTable();
    const id = text(request.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Contact id is required' }, { status: 400 });
    }

    if (!(await assertOwnedContact(tableName, context, id))) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM \`${tableName}\` WHERE id = ?`,
      id
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/club/settings/tables/contacts:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
