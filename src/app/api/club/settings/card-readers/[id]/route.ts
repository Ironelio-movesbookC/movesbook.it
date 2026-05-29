import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const READER_TABLE_CANDIDATES = ['club_card_readers', 'club_card_reader'];
const READER_TYPE_TABLE_CANDIDATES = ['club_card_reader_types', 'club_card_reader_type'];
const CONTROL_MODE_TABLE_CANDIDATES = ['club_card_control_modes', 'club_card_control_mode'];

function text(value: unknown): string {
  return String(value ?? '').trim();
}

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

async function ensureLocalCardReaderTables(): Promise<{
  readerTable: string;
  typeTable: string;
  modeTable: string;
}> {
  const readerTable = 'club_card_readers';
  const typeTable = 'club_card_reader_types';
  const modeTable = 'club_card_control_modes';

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${typeTable}\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL
    )
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${modeTable}\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(191) NOT NULL
    )
  `);
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
      iplocal VARCHAR(255) NULL,
      control_mode_id INT NOT NULL DEFAULT 1,
      enable CHAR(1) NOT NULL DEFAULT 'Y',
      activity_list TEXT NOT NULL,
      service_list TEXT NOT NULL,
      description VARCHAR(255) NOT NULL DEFAULT '',
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_card_readers_user_club (user_id, club_id)
    )
  `);

  return { readerTable, typeTable, modeTable };
}

async function getReaderTables(): Promise<{
  readerTable: string;
  typeTable: string | null;
  modeTable: string | null;
}> {
  const legacyReader = await findExistingTable(READER_TABLE_CANDIDATES);
  if (legacyReader) {
    await ensureReaderTableColumns(legacyReader);
    return {
      readerTable: legacyReader,
      typeTable: await findExistingTable(READER_TYPE_TABLE_CANDIDATES),
      modeTable: await findExistingTable(CONTROL_MODE_TABLE_CANDIDATES),
    };
  }
  const local = await ensureLocalCardReaderTables();
  await ensureReaderTableColumns(local.readerTable);
  return {
    readerTable: local.readerTable,
    typeTable: local.typeTable,
    modeTable: local.modeTable,
  };
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

/** Older local dev tables may lack columns present in CakePHP / newer schema. */
async function ensureReaderTableColumns(readerTable: string): Promise<void> {
  const columns = await getTableColumns(readerTable);
  const additions: string[] = [];
  if (!columns.has('iplocal')) {
    additions.push('ADD COLUMN `iplocal` VARCHAR(255) NULL');
  }
  if (!columns.has('id_cards')) {
    additions.push('ADD COLUMN `id_cards` VARCHAR(50) NULL');
  }
  if (!columns.has('num_order')) {
    additions.push('ADD COLUMN `num_order` INT NOT NULL DEFAULT 0');
  }
  if (!columns.has('description')) {
    additions.push('ADD COLUMN `description` VARCHAR(255) NOT NULL DEFAULT \'\'');
  }
  for (const clause of additions) {
    await prisma.$executeRawUnsafe(`ALTER TABLE \`${readerTable}\` ${clause}`);
  }
}

function readerDetailSelect(columns: Set<string>): string {
  const pick = (name: string, expr: string, fallback: string) =>
    columns.has(name) ? expr : fallback;

  return [
    pick('description', "COALESCE(r.description, '') AS description", "'' AS description"),
    pick('num_order', 'r.num_order', 'NULL AS num_order'),
    pick('reader_type_id', 'r.reader_type_id', '0 AS reader_type_id'),
    pick('iplocal', 'r.iplocal', "'' AS iplocal"),
    pick('ip', 'r.ip', "'' AS ip"),
    pick('enable', 'r.enable', "'N' AS enable"),
    pick('control_mode_id', 'r.control_mode_id', '0 AS control_mode_id'),
    pick('id_cards', 'r.id_cards', "'' AS id_cards"),
  ].join(',\n        ');
}

function defaultReaderPort(readerTypeId: string): string {
  return readerTypeId === '3' ? 'COM1' : 'USB';
}

function linkedIdCardsForType(typeName: string, typeId: string): string {
  const key = typeName.toLowerCase().replace(/\s+/g, '');
  if (key.includes('magnetic') || typeId === '1') return 'MAGNETIC';
  if (key.includes('qr')) return 'QR CODE';
  if (key.includes('smart')) return 'SMART';
  return 'RFID';
}

type RouteContext = { params: { id: string } };

async function assertReaderAccess(
  readerId: string,
  userIds: string[],
  clubId: string | null
): Promise<{ readerTable: string; typeTable: string | null } | null> {
  const { readerTable, typeTable } = await getReaderTables();
  const userPlaceholders = userIds.map(() => '?').join(',');

  type ExistsRow = { id: string | number };
  let rows: ExistsRow[] = await prisma.$queryRawUnsafe<ExistsRow[]>(
    `SELECT id FROM \`${readerTable}\`
     WHERE id = ? AND user_id IN (${userPlaceholders})`,
    readerId,
    ...userIds
  );

  if (rows.length === 0 && clubId) {
    rows = await prisma.$queryRawUnsafe<ExistsRow[]>(
      `SELECT id FROM \`${readerTable}\`
       WHERE id = ? AND user_id IN (${userPlaceholders}) AND club_id = ?`,
      readerId,
      ...userIds,
      clubId
    );
  }

  if (rows.length === 0) return null;
  return { readerTable, typeTable };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    const access = await assertReaderAccess(id, auth.userIds, auth.club?.id ?? null);
    if (!access) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const { readerTable, typeTable } = access;
    const columns = await getTableColumns(readerTable);
    const typeJoin = typeTable
      ? `LEFT JOIN \`${typeTable}\` rt ON rt.id = r.reader_type_id`
      : '';
    const typeNameSelect = typeTable ? 'COALESCE(rt.name, \'\') AS typeName' : '\'\' AS typeName';

    const rows = await prisma.$queryRawUnsafe<
      {
        description: string | null;
        num_order: number | string | null;
        reader_type_id: number | string | null;
        iplocal: string | null;
        ip: string | null;
        enable: string | null;
        control_mode_id: number | string | null;
        id_cards: string | null;
        typeName: string | null;
      }[]
    >(
      `SELECT
        ${readerDetailSelect(columns)},
        ${typeNameSelect}
      FROM \`${readerTable}\` r
      ${typeJoin}
      WHERE r.id = ?
      LIMIT 1`,
      id
    );

    const row = rows[0];
    if (!row) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const readerTypeId = row.reader_type_id != null ? String(row.reader_type_id) : '';
    const typeName = text(row.typeName);
    const idCards =
      text(row.id_cards) || linkedIdCardsForType(typeName, readerTypeId);

    return NextResponse.json({
      description: text(row.description),
      numOrder: row.num_order != null ? String(row.num_order) : '',
      readerTypeId,
      ipLocal: text(row.iplocal),
      ip: text(row.ip),
      enabled: yesNo(row.enable),
      controlModeId: row.control_mode_id != null ? String(row.control_mode_id) : '',
      idCards,
    });
  } catch (error) {
    console.error('GET /api/club/settings/card-readers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    const access = await assertReaderAccess(id, auth.userIds, auth.club?.id ?? null);
    if (!access) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const body = await request.json();
    const readerTypeId = text(body.readerTypeId);
    const controlModeId = text(body.controlModeId);
    const description = text(body.description);
    const numOrder = text(body.numOrder);
    const ipLocal = text(body.ipLocal);
    const ip = text(body.ip);
    const enabled = body.enabled !== false && body.enabled !== 'N';

    const fieldErrors: Record<string, string> = {};
    if (!readerTypeId) fieldErrors.readerTypeId = 'Please select reader type.';
    if (!controlModeId) fieldErrors.controlModeId = 'Please select reader mode.';
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ fieldErrors }, { status: 400 });
    }

    const { readerTable, typeTable } = access;
    const columns = await getTableColumns(readerTable);
    const userPlaceholders = auth.userIds.map(() => '?').join(',');

    let typeName = '';
    if (typeTable) {
      const typeRows = await prisma.$queryRawUnsafe<{ name: string }[]>(
        `SELECT name FROM \`${typeTable}\` WHERE id = ? LIMIT 1`,
        readerTypeId
      );
      typeName = text(typeRows[0]?.name);
    }

    const idCards = linkedIdCardsForType(typeName, readerTypeId);
    const readerPort = defaultReaderPort(readerTypeId);

    const updates: Record<string, unknown> = {
      reader_type_id: Number(readerTypeId),
      reader_port: readerPort,
      ip,
      iplocal: ipLocal || null,
      control_mode_id: Number(controlModeId),
      enable: enabled ? 'Y' : 'N',
      description,
    };

    if (columns.has('id_cards')) updates.id_cards = idCards;
    if (columns.has('num_order') && numOrder !== '') {
      updates.num_order = Number(numOrder) || 0;
    }

    const setClause = Object.keys(updates)
      .filter((key) => columns.has(key))
      .map((key) => `\`${key}\` = ?`)
      .join(', ');

    if (!setClause) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const values = Object.keys(updates)
      .filter((key) => columns.has(key))
      .map((key) => updates[key]);

    await prisma.$executeRawUnsafe(
      `UPDATE \`${readerTable}\` SET ${setClause}
       WHERE id = ? AND user_id IN (${userPlaceholders})`,
      ...values,
      id,
      ...auth.userIds
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /api/club/settings/card-readers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    const access = await assertReaderAccess(id, auth.userIds, auth.club?.id ?? null);
    if (!access) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const { readerTable } = access;
    const userPlaceholders = auth.userIds.map(() => '?').join(',');

    await prisma.$executeRawUnsafe(
      `DELETE FROM \`${readerTable}\`
       WHERE id = ? AND user_id IN (${userPlaceholders})`,
      id,
      ...auth.userIds
    );

    return NextResponse.json({ success: true, message: 'Reader deleted successfully.' });
  } catch (error) {
    console.error('DELETE /api/club/settings/card-readers/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
