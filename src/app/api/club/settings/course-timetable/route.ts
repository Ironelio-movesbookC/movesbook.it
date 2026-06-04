import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { buildCourseTimetableRows } from '@/lib/clubCourseTimetable';
import { text } from '@/lib/clubCardTimetable';

export const dynamic = 'force-dynamic';

const TIMETABLE_TABLE_CANDIDATES = ['club_card_timetables', 'club_card_timetable'];
const TYPOLOGY_TABLE_CANDIDATES = [
  'club_setting_subscription_typologies',
  'club_setting_subscription_typology'
];

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
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );
  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  return candidates.find((c) => existing.has(c)) ?? null;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    tableName
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function getLegacyUserId(userId: string): Promise<string | null> {
  const fromId = userId.match(/^legacy_(\d+)(?:_|$)/);
  if (fromId?.[1]) return fromId[1];

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id FROM \`${mappingTable}\`
     WHERE new_id = ? AND legacy_table = 'users'
     ORDER BY legacy_id DESC LIMIT 1`,
    userId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getLegacyClubId(clubId: string): Promise<string | null> {
  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id FROM \`${mappingTable}\`
     WHERE new_id = ? AND legacy_table = 'clubs'
     ORDER BY legacy_id DESC LIMIT 1`,
    clubId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name FROM clubs_new
      WHERE id = ${requestedClubId} AND adminId = ${userId} LIMIT 1
    `;
    if (selected[0]) return selected[0];
  }

  const fallback = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC LIMIT 1
  `;

  return fallback[0] ?? null;
}

type TimetableJoinRow = {
  typology_message_id: string | number;
  am_time: string | null;
  pm_time: string | null;
  activity_name: string | null;
  color: string | null;
};

async function fetchTimetableRows(
  timetableTable: string,
  typologyTable: string,
  userIds: string[],
  clubIds: string[]
): Promise<TimetableJoinRow[]> {
  const typologyColumns = await getTableColumns(typologyTable);
  const hasColor = typologyColumns.has('color');
  const hasClubId = typologyColumns.has('club_id');
  const colorSelect = hasColor ? 'COALESCE(ty.color, \'\') AS color' : '\'\' AS color';

  const userPlaceholders = userIds.map(() => '?').join(',');
  const baseSql = `
    SELECT
      t.typology_message_id,
      t.am_time,
      t.pm_time,
      ty.activity_name,
      ${colorSelect}
    FROM \`${timetableTable}\` t
    INNER JOIN \`${typologyTable}\` ty ON ty.id = t.typology_message_id
    WHERE t.user_id IN (${userPlaceholders})
      AND ty.user_id IN (${userPlaceholders})
  `;

  if (hasClubId && clubIds.length > 0) {
    const clubPlaceholders = clubIds.map(() => '?').join(',');
    const filtered = await prisma.$queryRawUnsafe<TimetableJoinRow[]>(
      `${baseSql} AND ty.club_id IN (${clubPlaceholders})
       ORDER BY t.id ASC`,
      ...userIds,
      ...userIds,
      ...clubIds
    );
    if (filtered.length > 0) {
      return filtered;
    }
  }

  return prisma.$queryRawUnsafe<TimetableJoinRow[]>(
    `${baseSql} ORDER BY t.id ASC`,
    ...userIds,
    ...userIds
  );
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getTokenPayload(request);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isClubAccountUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = String(decoded.userId);
    const legacyUserId = await getLegacyUserId(userId);
    const userIds = Array.from(new Set([userId, legacyUserId].filter(Boolean) as string[]));
    const club = await getOwnedClub(userId, request.nextUrl.searchParams.get('clubId'));
    const legacyClubId = club ? await getLegacyClubId(club.id) : null;
    const clubIds = Array.from(new Set([club?.id, legacyClubId].filter(Boolean) as string[]));

    const timetableTable = await findExistingTable(TIMETABLE_TABLE_CANDIDATES);
    const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
    if (!timetableTable || !typologyTable) {
      return NextResponse.json({ rows: [] });
    }

    const timetableRows = await fetchTimetableRows(
      timetableTable,
      typologyTable,
      userIds,
      clubIds
    );

    const rows = buildCourseTimetableRows(
      timetableRows.map((row) => ({
        typologyId: String(row.typology_message_id),
        amTime: row.am_time,
        pmTime: row.pm_time,
        activityName: text(row.activity_name),
        color: text(row.color)
      }))
    );

    return NextResponse.json({ rows });
  } catch (error) {
    console.error('GET /api/club/settings/course-timetable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
