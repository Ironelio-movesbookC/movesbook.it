import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  buildTimetableDbValues,
  createEmptyTimetableForm,
  mapDbRowToTimetableForm,
  text
} from '@/lib/clubCardTimetable';

export const dynamic = 'force-dynamic';

const TIMETABLE_TABLE_CANDIDATES = ['club_card_timetables', 'club_card_timetable'];
const TYPOLOGY_TABLE_CANDIDATES = [
  'club_setting_subscription_typologies',
  'club_setting_subscription_typology'
];

type AuthorizedContext = {
  userId: string;
  club: { id: string; name: string } | null;
  userIds: string[];
};

function yesNo(value: unknown): boolean {
  return value === 'Y' || value === 'y' || value === true || value === 1 || value === '1';
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

async function ensureLocalTimetableTable(): Promise<string> {
  const tableName = 'club_card_timetables';
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      typology_message_id VARCHAR(191) NOT NULL,
      subscription_id VARCHAR(191) NOT NULL DEFAULT '0',
      am_time TEXT NOT NULL,
      pm_time TEXT NOT NULL,
      rangValue TEXT NOT NULL,
      enabled TEXT NULL,
      permit_minute_access INT NULL,
      blocking_minute_access INT NULL,
      reserve_maxnumber VARCHAR(20) DEFAULT '5',
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_card_timetable_user_typology (user_id, typology_message_id)
    )
  `);
  return tableName;
}

async function getTimetableTableForRead(): Promise<string> {
  const existing = await findExistingTable(TIMETABLE_TABLE_CANDIDATES);
  return existing ?? ensureLocalTimetableTable();
}

async function getTimetableTableForWrite(): Promise<string> {
  return getTimetableTableForRead();
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

async function fetchTypologyOptions(userIds: string[], clubId: string | null) {
  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) return [];

  const userPlaceholders = userIds.map(() => '?').join(',');
  const columns = await getTableColumns(typologyTable);
  const clubFilter = clubId && columns.has('club_id') ? ' AND club_id = ?' : '';

  const rows = await prisma.$queryRawUnsafe<{ id: string | number; activity_name: string | null }[]>(
    `SELECT id, activity_name
     FROM \`${typologyTable}\`
     WHERE user_id IN (${userPlaceholders})
       ${clubFilter}
     ORDER BY id DESC`,
    ...userIds,
    ...(clubFilter ? [clubId] : [])
  );

  return rows.map((row) => ({
    id: String(row.id),
    name: text(row.activity_name) || `Typology ${row.id}`
  }));
}

async function fetchTypologyEditableFlag(typologyId: string, userIds: string[]): Promise<boolean> {
  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) return false;

  const columns = await getTableColumns(typologyTable);
  if (!columns.has('editable_subscription_timetable')) {
    return false;
  }

  const userPlaceholders = userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ editable_subscription_timetable: string | null }[]>(
    `SELECT editable_subscription_timetable
     FROM \`${typologyTable}\`
     WHERE id = ?
       AND user_id IN (${userPlaceholders})
     LIMIT 1`,
    typologyId,
    ...userIds
  );

  return yesNo(rows[0]?.editable_subscription_timetable);
}

async function fetchTimetableRow(
  typologyId: string,
  userIds: string[]
): Promise<Record<string, unknown> | null> {
  const tableName = await getTimetableTableForRead();
  const userPlaceholders = userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT *
     FROM \`${tableName}\`
     WHERE typology_message_id = ?
       AND user_id IN (${userPlaceholders})
     ORDER BY id DESC
     LIMIT 1`,
    typologyId,
    ...userIds
  );

  return rows[0] ?? null;
}

async function updateTypologyEditableFlag(
  typologyId: string,
  userIds: string[],
  editable: boolean
): Promise<void> {
  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) return;

  const columns = await getTableColumns(typologyTable);
  if (!columns.has('editable_subscription_timetable')) return;

  const userPlaceholders = userIds.map(() => '?').join(',');
  await prisma.$executeRawUnsafe(
    `UPDATE \`${typologyTable}\`
     SET editable_subscription_timetable = ?
     WHERE id = ?
       AND user_id IN (${userPlaceholders})`,
    editable ? 'Y' : 'N',
    typologyId,
    ...userIds
  );
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const typologyId = request.nextUrl.searchParams.get('typologyId') ?? '';
    const typologies = await fetchTypologyOptions(context.userIds, context.club?.id ?? null);

    if (!typologyId) {
      return NextResponse.json({
        club: context.club,
        typologies,
        timetable: null
      });
    }

    const editable = await fetchTypologyEditableFlag(typologyId, context.userIds);
    const row = await fetchTimetableRow(typologyId, context.userIds);
    const timetable = row
      ? mapDbRowToTimetableForm(row, typologyId, editable)
      : { ...createEmptyTimetableForm(typologyId), editableSubscriptionTimetable: editable };

    return NextResponse.json({
      club: context.club,
      typologies,
      timetable
    });
  } catch (error) {
    console.error('GET /api/club/settings/card-timetable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const body = await request.json();
    const typologyId = text(body.typologyId);
    if (!typologyId || typologyId.startsWith('local-')) {
      return NextResponse.json({ error: 'Invalid typology id' }, { status: 400 });
    }

    const tableName = await getTimetableTableForWrite();
    const columns = await getTableColumns(tableName);
    const userId = context.userIds[context.userIds.length - 1] ?? context.userId;
    const values = buildTimetableDbValues(body);
    values.user_id = userId;

    await updateTypologyEditableFlag(
      typologyId,
      context.userIds,
      Boolean(body.editableSubscriptionTimetable)
    );

    const existing = await fetchTimetableRow(typologyId, context.userIds);
    const dbValues = Object.fromEntries(
      Object.entries(values).filter(([column, value]) => columns.has(column) && value != null)
    );

    if (existing?.id != null) {
      const updateColumns = Object.keys(dbValues).filter((column) => column !== 'user_id');
      if (updateColumns.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE \`${tableName}\`
           SET ${updateColumns.map((column) => `\`${column}\` = ?`).join(', ')}
           WHERE id = ?`,
          ...updateColumns.map((column) => dbValues[column]),
          existing.id
        );
      }
      return NextResponse.json({ success: true, id: String(existing.id) });
    }

    const insertColumns = Object.keys(dbValues);
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\`
         (${insertColumns.map((column) => `\`${column}\``).join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')})`,
      ...insertColumns.map((column) => dbValues[column])
    );

    const idRows = await prisma.$queryRawUnsafe<{ id: bigint | number | string }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );

    return NextResponse.json({
      success: true,
      id: idRows[0]?.id != null ? String(idRows[0].id) : null
    });
  } catch (error) {
    console.error('POST /api/club/settings/card-timetable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
