import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const READER_TABLE_CANDIDATES = ['club_card_readers', 'club_card_reader'];
const READER_TYPE_TABLE_CANDIDATES = ['club_card_reader_types', 'club_card_reader_type'];
const CONTROL_MODE_TABLE_CANDIDATES = ['club_card_control_modes', 'club_card_control_mode'];
const TYPOLOGY_TABLE_CANDIDATES = [
  'club_setting_subscription_typologies',
  'club_setting_subscription_typology',
];
const SERVICE_TABLE_CANDIDATES = ['club_setting_services', 'club_setting_service'];

import type { CardReaderListItem } from '@/types/clubCardReaders';

function yesNo(value: unknown): boolean {
  return value === 'Y' || value === 'y' || value === true || value === 1 || value === '1';
}

function text(value: unknown): string {
  return String(value ?? '').trim();
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

async function loadActivityLabels(
  activityIds: string[],
  userIds: string[]
): Promise<Record<string, string>> {
  if (activityIds.length === 0) return {};

  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) return {};

  const placeholders = activityIds.map(() => '?').join(',');
  const userPlaceholders = userIds.map(() => '?').join(',');

  const rows = await prisma.$queryRawUnsafe<{ id: string | number; label: string | null }[]>(
    `SELECT id, activity_name AS label
     FROM \`${typologyTable}\`
     WHERE id IN (${placeholders})
       AND user_id IN (${userPlaceholders})`,
    ...activityIds,
    ...userIds
  );

  return rows.reduce<Record<string, string>>((acc, row) => {
    if (row.id != null && row.label) acc[String(row.id)] = String(row.label);
    return acc;
  }, {});
}

async function loadServiceLabels(serviceIds: string[]): Promise<Record<string, string>> {
  if (serviceIds.length === 0) return {};

  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);
  if (!serviceTable) return {};

  const placeholders = serviceIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ id: string | number; label: string | null }[]>(
    `SELECT id, service_name AS label
     FROM \`${serviceTable}\`
     WHERE id IN (${placeholders})`,
    ...serviceIds
  );

  return rows.reduce<Record<string, string>>((acc, row) => {
    if (row.id != null && row.label) acc[String(row.id)] = String(row.label);
    return acc;
  }, {});
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

  const typeCount = await prisma.$queryRawUnsafe<{ c: bigint | number }[]>(
    `SELECT COUNT(*) AS c FROM \`${typeTable}\``
  );
  if (Number(typeCount[0]?.c ?? 0) === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${typeTable}\` (id, name) VALUES (1, 'KED KT2280'), (2, 'SILIFID MBR1'), (3, 'Generic RFID')`
    );
  }

  const modeCount = await prisma.$queryRawUnsafe<{ c: bigint | number }[]>(
    `SELECT COUNT(*) AS c FROM \`${modeTable}\``
  );
  if (Number(modeCount[0]?.c ?? 0) === 0) {
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${modeTable}\` (id, name) VALUES
        (1, 'Primary control'),
        (2, 'Access to sport halls'),
        (3, 'Parking'),
        (4, 'Internal end-user station'),
        (6, 'Services to decrease')`
    );
  }

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

async function fetchReaders(userIds: string[], clubId: string | null): Promise<CardReaderListItem[]> {
  const { readerTable, typeTable, modeTable } = await getReaderTables();

  const userPlaceholders = userIds.map(() => '?').join(',');

  const typeJoin = typeTable
    ? `LEFT JOIN \`${typeTable}\` rt ON rt.id = r.reader_type_id`
    : '';
  const modeJoin = modeTable
    ? `LEFT JOIN \`${modeTable}\` cm ON cm.id = r.control_mode_id`
    : '';

  const typeSelect = typeTable ? 'COALESCE(rt.name, \'\') AS readerType' : '\'\' AS readerType';
  const modeSelect = modeTable ? 'COALESCE(cm.name, \'\') AS controlMode' : '\'\' AS controlMode';

  const baseSql = `
    SELECT
      r.id AS id,
      COALESCE(r.description, '') AS description,
      COALESCE(r.reader_name, '') AS readerName,
      ${typeSelect},
      ${modeSelect},
      COALESCE(r.control_mode_id, 0) AS controlModeId,
      COALESCE(r.reader_port, '') AS readerPort,
      COALESCE(r.enable, 'N') AS enable,
      COALESCE(r.activity_list, '') AS activityList,
      COALESCE(r.service_list, '') AS serviceList
    FROM \`${readerTable}\` r
    ${typeJoin}
    ${modeJoin}
    WHERE r.user_id IN (${userPlaceholders})
  `;

  type RawRow = {
    id: string | number;
    description: string | null;
    readerName: string | null;
    readerType: string | null;
    controlMode: string | null;
    controlModeId: number | string | null;
    readerPort: string | null;
    enable: string | null;
    activityList: string | null;
    serviceList: string | null;
  };

  let rows: RawRow[] = [];
  if (clubId) {
    rows = await prisma.$queryRawUnsafe<RawRow[]>(
      `${baseSql} AND r.club_id = ? ORDER BY r.id DESC`,
      ...userIds,
      clubId
    );
  }
  if (rows.length === 0) {
    rows = await prisma.$queryRawUnsafe<RawRow[]>(
      `${baseSql} ORDER BY r.id DESC`,
      ...userIds
    );
  }

  const allActivityIds = new Set<string>();
  const allServiceIds = new Set<string>();
  for (const row of rows) {
    text(row.activityList)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .forEach((id) => allActivityIds.add(id));
    text(row.serviceList)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .forEach((id) => allServiceIds.add(id));
  }

  const activityLabels = await loadActivityLabels(Array.from(allActivityIds), userIds);
  const serviceLabels = await loadServiceLabels(Array.from(allServiceIds));

  return rows.map((row) => {
    const activityIds = text(row.activityList)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);
    const serviceIds = text(row.serviceList)
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    return {
      id: String(row.id),
      description: text(row.description),
      readerName: text(row.readerName),
      readerType: text(row.readerType),
      controlMode: text(row.controlMode),
      controlModeId: Number(row.controlModeId ?? 0),
      readerPort: text(row.readerPort),
      enabled: yesNo(row.enable),
      activities: activityIds.map((id) => ({
        id,
        label: activityLabels[id] || `Activity #${id}`,
      })),
      services: serviceIds.map((id) => ({
        id,
        label: serviceLabels[id] || `Service #${id}`,
      })),
    };
  });
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

async function fetchReaderMeta(): Promise<{
  readerTypes: { id: string; name: string }[];
  controlModes: { id: string; name: string }[];
}> {
  const { typeTable, modeTable } = await getReaderTables();
  const readerTypes: { id: string; name: string }[] = [];
  const controlModes: { id: string; name: string }[] = [];

  if (typeTable) {
    const rows = await prisma.$queryRawUnsafe<{ id: number | string; name: string }[]>(
      `SELECT id, name FROM \`${typeTable}\` ORDER BY id ASC`
    );
    for (const row of rows) {
      readerTypes.push({ id: String(row.id), name: String(row.name) });
    }
  }

  if (modeTable) {
    const rows = await prisma.$queryRawUnsafe<{ id: number | string; name: string }[]>(
      `SELECT id, name FROM \`${modeTable}\` ORDER BY id ASC`
    );
    for (const row of rows) {
      controlModes.push({ id: String(row.id), name: String(row.name) });
    }
  }

  return { readerTypes, controlModes };
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

async function nextReaderNumber(readerTable: string, userIds: string[]): Promise<number> {
  const userPlaceholders = userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ maxNum: number | null }[]>(
    `SELECT MAX(reader_number) AS maxNum FROM \`${readerTable}\` WHERE user_id IN (${userPlaceholders})`,
    ...userIds
  );
  return Number(rows[0]?.maxNum ?? 0) + 1;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const items = await fetchReaders(context.userIds, context.club?.id ?? null);
    const meta = await fetchReaderMeta();

    return NextResponse.json({
      club: context.club,
      items,
      readerTypes: meta.readerTypes,
      controlModes: meta.controlModes,
      source: 'database',
    });
  } catch (error) {
    console.error('GET /api/club/settings/card-readers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

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

    const { readerTable, typeTable } = await getReaderTables();
    const columns = await getTableColumns(readerTable);

    let typeName = '';
    if (typeTable) {
      const typeRows = await prisma.$queryRawUnsafe<{ name: string }[]>(
        `SELECT name FROM \`${typeTable}\` WHERE id = ? LIMIT 1`,
        readerTypeId
      );
      typeName = text(typeRows[0]?.name);
    }

    const readerNumber = await nextReaderNumber(readerTable, context.userIds);
    const readerName = `reader-${readerNumber}`;
    const readerPort = defaultReaderPort(readerTypeId);
    const idCards = linkedIdCardsForType(typeName, readerTypeId);
    const clubId = context.club?.id ?? null;
    const primaryUserId = context.userIds[0];

    const baseFields: Record<string, unknown> = {
      user_id: primaryUserId,
      club_id: clubId,
      reader_number: readerNumber,
      reader_name: readerName,
      reader_type_id: Number(readerTypeId),
      reader_port: readerPort,
      ip,
      iplocal: ipLocal || null,
      control_mode_id: Number(controlModeId),
      enable: enabled ? 'Y' : 'N',
      activity_list: '',
      service_list: '',
      description,
    };

    if (columns.has('id_cards')) baseFields.id_cards = idCards;
    if (columns.has('num_order') && numOrder) baseFields.num_order = Number(numOrder) || 0;

    const fieldNames = Object.keys(baseFields).filter((key) => columns.has(key));
    const placeholders = fieldNames.map(() => '?').join(', ');
    const values = fieldNames.map((key) => baseFields[key]);

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${readerTable}\` (${fieldNames.map((f) => `\`${f}\``).join(', ')})
       VALUES (${placeholders})`,
      ...values
    );

    const idRows = await prisma.$queryRawUnsafe<{ id: bigint | number | string }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );
    const newId = idRows[0]?.id != null ? String(idRows[0].id) : null;

    const items = await fetchReaders(context.userIds, clubId);

    return NextResponse.json({
      success: true,
      id: newId,
      items,
    });
  } catch (error) {
    console.error('POST /api/club/settings/card-readers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
