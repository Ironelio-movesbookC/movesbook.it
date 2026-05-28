import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

const READER_TABLE_CANDIDATES = ['club_card_readers', 'club_card_reader'];

export function text(value: unknown): string {
  return String(value ?? '').trim();
}

export function yesNo(value: unknown): boolean {
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

export async function getAuthorizedContext(request: NextRequest) {
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

export async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    tableName
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

async function ensureLocalCardReaderTables(): Promise<{ readerTable: string }> {
  const readerTable = 'club_card_readers';
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${readerTable}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      club_id VARCHAR(191) NULL,
      reader_number INT NOT NULL DEFAULT 0,
      reader_name VARCHAR(250) NOT NULL,
      reader_type_id INT NOT NULL DEFAULT 1,
      reader_port VARCHAR(50) NOT NULL DEFAULT 'COM1',
      ip VARCHAR(255) NOT NULL DEFAULT '',
      control_mode_id INT NOT NULL DEFAULT 1,
      enable CHAR(1) NOT NULL DEFAULT 'Y',
      activity_list TEXT NOT NULL,
      service_list TEXT NOT NULL,
      description VARCHAR(255) NOT NULL DEFAULT '',
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
  return { readerTable };
}

export async function getReaderTable(): Promise<string> {
  const legacy = await findExistingTable(READER_TABLE_CANDIDATES);
  if (legacy) return legacy;
  const local = await ensureLocalCardReaderTables();
  return local.readerTable;
}

export async function assertReaderAccess(
  readerId: string,
  userIds: string[]
): Promise<{ readerTable: string } | null> {
  const readerTable = await getReaderTable();
  const userPlaceholders = userIds.map(() => '?').join(',');

  const rows = await prisma.$queryRawUnsafe<{ id: string | number }[]>(
    `SELECT id FROM \`${readerTable}\`
     WHERE id = ? AND user_id IN (${userPlaceholders})`,
    readerId,
    ...userIds
  );

  if (rows.length === 0) return null;
  return { readerTable };
}
