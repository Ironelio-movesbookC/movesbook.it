import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { getServerPublicDir } from '@/lib/serverPublicDir';

export const dynamic = 'force-dynamic';

type AuthorizedContext = {
  userId: string;
  legacyUserId: string | null;
  club: { id: string; name: string } | null;
  userIds: string[];
};

type ServicePayload = {
  sectorId: string;
  serviceName: string;
  cost: string;
  removeImage: boolean;
  image: File | null;
};

type ServiceRow = {
  id: string | number | bigint;
  user_id?: string | number | bigint | null;
  club_id?: string | number | bigint | null;
  sector_id?: string | number | bigint | null;
  service_name?: string | null;
  club_currency_cost?: string | number | null;
  actual_cost?: string | number | null;
  club_currency_code?: string | null;
  service_img?: string | null;
  service_available?: number | string | null;
  show_cost?: number | string | null;
  video_url?: string | null;
  order_position?: number | string | null;
  sector_name?: string | null;
  created?: string | Date | null;
  modified?: string | Date | null;
};

type SectorRow = {
  id: string | number | bigint;
  sector_name?: string | null;
};

const SERVICE_TABLE_CANDIDATES = ['club_setting_special_services', 'club_setting_special_service'];
const SECTOR_TABLE_CANDIDATES = ['club_setting_sectors', 'club_setting_sector'];
const SERVICE_TABLE = 'club_setting_special_services';
const SECTOR_TABLE = 'club_setting_sectors';
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const SERVICE_IMAGE_DIR = ['img', 'special_services'];
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);
const INITIAL_SECTORS = [
  'Beauty',
  'Fitness',
  'Massage',
  'Other Services',
  'Parking',
  'Spa',
  'Sport Services',
  'Theorapy'
];

const SERVICE_COLUMN_DEFINITIONS: Record<string, string> = {
  user_id: 'VARCHAR(191) NULL',
  club_id: 'VARCHAR(191) NULL',
  sector_id: 'VARCHAR(191) NULL',
  service_name: 'VARCHAR(255) NULL',
  club_currency_cost: 'VARCHAR(80) NULL',
  actual_cost: 'VARCHAR(80) NULL',
  club_currency_code: 'VARCHAR(20) NULL',
  service_img: 'VARCHAR(255) NULL',
  service_available: 'TINYINT(1) NOT NULL DEFAULT 1',
  show_cost: 'TINYINT(1) NOT NULL DEFAULT 1',
  video_url: 'VARCHAR(500) NULL',
  order_position: 'INT NULL',
  created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

const SECTOR_COLUMN_DEFINITIONS: Record<string, string> = {
  sector_name: 'VARCHAR(191) NOT NULL',
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

function normalizeExtension(fileName: string): '.png' | '.jpg' | '.gif' | '.webp' | null {
  const extension = extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return null;
  if (extension === '.png') return '.png';
  if (extension === '.gif') return '.gif';
  if (extension === '.webp') return '.webp';
  return '.jpg';
}

function hasValidImageSignature(buffer: Buffer, extension: '.png' | '.jpg' | '.gif' | '.webp'): boolean {
  if (extension === '.png') {
    return buffer.length > 8
      && buffer[0] === 0x89
      && buffer[1] === 0x50
      && buffer[2] === 0x4e
      && buffer[3] === 0x47;
  }

  if (extension === '.jpg') {
    return buffer.length > 3
      && buffer[0] === 0xff
      && buffer[1] === 0xd8
      && buffer[2] === 0xff;
  }

  if (extension === '.gif') {
    return buffer.length > 6
      && buffer[0] === 0x47
      && buffer[1] === 0x49
      && buffer[2] === 0x46;
  }

  return buffer.length > 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP';
}

function safeBaseName(fileName: string) {
  const base = fileName.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  return base.slice(0, 48) || 'special_service';
}

function yesNo(value: unknown): boolean {
  return value === true
    || value === 1
    || value === '1'
    || value === 'Y'
    || value === 'y'
    || value === 'true';
}

function normalizeServiceImagePath(value: unknown): string | null {
  const image = text(value);
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  if (image.startsWith('/api/media/img/special_services/')) return image;
  if (image.startsWith('/img/special_services/')) return `/api/media${image}`;
  if (image.startsWith('img/special_services/')) return `/api/media/${image}`;
  if (image.startsWith('/')) return image;
  return `/api/media/img/special_services/${image.replace(/^\/+/, '')}`;
}

function getServiceImageDiskPath(value: unknown): string | null {
  const imagePath = normalizeServiceImagePath(value);
  if (!imagePath) return null;
  let publicRelative: string | null = null;
  if (imagePath.startsWith('/api/media/img/special_services/')) {
    publicRelative = 'img/special_services/' + imagePath.slice('/api/media/img/special_services/'.length);
  } else if (imagePath.startsWith('/img/special_services/')) {
    publicRelative = imagePath.slice(1);
  }
  if (!publicRelative) return null;
  return join(getServerPublicDir(), publicRelative);
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

async function ensureSectorTable(): Promise<string> {
  const existing = await findExistingTable(SECTOR_TABLE_CANDIDATES);
  const tableName = existing ?? SECTOR_TABLE;

  if (!existing) {
    const columnSql = Object.entries(SECTOR_COLUMN_DEFINITIONS)
      .map(([column, definition]) => `\`${column}\` ${definition}`)
      .join(',\n      ');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ${columnSql},
        INDEX idx_club_setting_sectors_name (sector_name)
      )
    `);
  }

  const columns = await getTableColumns(tableName);
  for (const [column, definition] of Object.entries(SECTOR_COLUMN_DEFINITIONS)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${column}\` ${definition}`
      );
    }
  }

  const countRows = await prisma.$queryRawUnsafe<{ count: number | bigint }[]>(
    `SELECT COUNT(*) AS count FROM \`${tableName}\``
  );
  const existingCount = Number(countRows[0]?.count ?? 0);
  const legacyGeneralRows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT id
     FROM \`${tableName}\`
     WHERE LOWER(TRIM(sector_name)) = LOWER(TRIM(?))`,
    'General'
  );
  const hasOnlyLegacyGeneralSeed = existingCount === legacyGeneralRows.length && legacyGeneralRows.length > 0;

  for (const sector of INITIAL_SECTORS) {
    const sectorRows = await prisma.$queryRawUnsafe<{ count: number | bigint }[]>(
      `SELECT COUNT(*) AS count
       FROM \`${tableName}\`
       WHERE LOWER(TRIM(sector_name)) = LOWER(TRIM(?))`,
      sector
    );

    if (Number(sectorRows[0]?.count ?? 0) === 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${tableName}\` (sector_name) VALUES (?)`,
        sector
      );
    }
  }

  if (hasOnlyLegacyGeneralSeed) {
    const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);
    let generalHasServices = false;

    if (serviceTable) {
      const serviceColumns = await getTableColumns(serviceTable);
      if (serviceColumns.has('sector_id')) {
        for (const row of legacyGeneralRows) {
          const usageRows = await prisma.$queryRawUnsafe<{ count: number | bigint }[]>(
            `SELECT COUNT(*) AS count
             FROM \`${serviceTable}\`
             WHERE CAST(sector_id AS CHAR) = ?`,
            String(row.id)
          );
          if (Number(usageRows[0]?.count ?? 0) > 0) {
            generalHasServices = true;
            break;
          }
        }
      }
    }

    if (!generalHasServices) {
      await prisma.$executeRawUnsafe(
        `DELETE FROM \`${tableName}\`
         WHERE LOWER(TRIM(sector_name)) = LOWER(TRIM(?))`,
        'General'
      );
    }
  }

  return tableName;
}

async function ensureServicesTable(): Promise<string> {
  const existing = await findExistingTable(SERVICE_TABLE_CANDIDATES);
  const tableName = existing ?? SERVICE_TABLE;

  if (!existing) {
    const columnSql = Object.entries(SERVICE_COLUMN_DEFINITIONS)
      .map(([column, definition]) => `\`${column}\` ${definition}`)
      .join(',\n      ');

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`${tableName}\` (
        id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
        ${columnSql},
        INDEX idx_club_setting_special_services_user_club (user_id, club_id),
        INDEX idx_club_setting_special_services_sector (sector_id),
        INDEX idx_club_setting_special_services_name (service_name),
        INDEX idx_club_setting_special_services_order (order_position)
      )
    `);
  }

  const columns = await getTableColumns(tableName);
  for (const [column, definition] of Object.entries(SERVICE_COLUMN_DEFINITIONS)) {
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

function fileFromForm(formData: FormData): File | null {
  const value = formData.get('image');
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

function parsePayload(formData: FormData): ServicePayload {
  return {
    sectorId: text(formData.get('sectorId')),
    serviceName: text(formData.get('serviceName')),
    cost: text(formData.get('cost')),
    removeImage: formData.get('removeImage') === '1',
    image: fileFromForm(formData)
  };
}

async function validatePayload(sectorTable: string, payload: ServicePayload): Promise<Record<string, string>> {
  const fieldErrors: Record<string, string> = {};

  if (!payload.sectorId) {
    fieldErrors.sectorId = 'Please select a sector.';
  } else {
    const sectorRows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
      `SELECT id FROM \`${sectorTable}\` WHERE id = ? LIMIT 1`,
      payload.sectorId
    );

    if (!sectorRows[0]) {
      fieldErrors.sectorId = 'Selected sector does not exist.';
    }
  }

  if (!payload.serviceName) {
    fieldErrors.serviceName = 'Please enter service name.';
  }

  if (!payload.cost) {
    fieldErrors.cost = 'Please enter cost.';
  } else if (!Number.isFinite(Number(payload.cost)) || Number(payload.cost) < 0) {
    fieldErrors.cost = 'Cost must be a number greater than or equal to 0.';
  }

  if (payload.image) {
    if (payload.image.size > MAX_IMAGE_BYTES) {
      fieldErrors.image = 'Service image must be 5MB or smaller.';
    } else if (!normalizeExtension(payload.image.name)) {
      fieldErrors.image = 'Only PNG, JPG, GIF, or WEBP images are allowed.';
    } else if (payload.image.type && !ALLOWED_MIME_TYPES.has(payload.image.type)) {
      fieldErrors.image = 'Only PNG, JPG, GIF, or WEBP images are allowed.';
    }
  }

  return fieldErrors;
}

async function ensureNoDuplicate(
  tableName: string,
  context: AuthorizedContext,
  payload: ServicePayload,
  exceptId?: string
): Promise<boolean> {
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ count: number | bigint }[]>(
    `SELECT COUNT(*) AS count
     FROM \`${tableName}\`
     WHERE user_id IN (${userPlaceholders})
       AND CAST(sector_id AS CHAR) = ?
       AND LOWER(TRIM(service_name)) = LOWER(TRIM(?))
       ${exceptId ? 'AND id <> ?' : ''}`,
    ...context.userIds,
    payload.sectorId,
    payload.serviceName,
    ...(exceptId ? [exceptId] : [])
  );

  return Number(rows[0]?.count ?? 0) === 0;
}

async function getOwnedService(
  tableName: string,
  context: AuthorizedContext,
  id: string
): Promise<ServiceRow | null> {
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<ServiceRow[]>(
    `SELECT id, user_id, club_id, sector_id, service_name, club_currency_cost,
            actual_cost, club_currency_code, service_img, created, modified
     FROM \`${tableName}\`
     WHERE id = ?
       AND user_id IN (${userPlaceholders})
     LIMIT 1`,
    id,
    ...context.userIds
  );

  return rows[0] ?? null;
}

async function saveServiceImage(file: File): Promise<{ path: string } | { error: string }> {
  const extension = normalizeExtension(file.name);
  if (!extension) return { error: 'Only PNG, JPG, GIF, or WEBP images are allowed.' };

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(buffer, extension)) {
    return { error: 'The selected file is not a valid service image.' };
  }

  const uploadDir = join(getServerPublicDir(), ...SERVICE_IMAGE_DIR);
  await mkdir(uploadDir, { recursive: true });

  const fileName = `SpecialService_${Date.now()}_${Math.round(Math.random() * 1_000_000)}_${safeBaseName(file.name)}${extension}`;
  await writeFile(join(uploadDir, fileName), buffer, { flag: 'wx' });
  return { path: `/img/special_services/${fileName}` };
}

async function deleteServiceImage(value: unknown) {
  const diskPath = getServiceImageDiskPath(value);
  if (!diskPath) return;

  try {
    await unlink(diskPath);
  } catch {
    // Missing old images should not block the table update.
  }
}

function getActualCost(cost: string) {
  const numericCost = Number(cost);
  return Number.isFinite(numericCost) ? String(numericCost) : '0';
}

function normalizeSector(row: SectorRow) {
  return {
    id: String(row.id),
    name: text(row.sector_name)
  };
}

function normalizeService(row: ServiceRow) {
  const imageUrl = normalizeServiceImagePath(row.service_img);

  return {
    id: String(row.id),
    sectorId: text(row.sector_id),
    sectorName: text(row.sector_name) || 'Unassigned',
    serviceName: text(row.service_name),
    cost: text(row.club_currency_cost),
    actualCost: text(row.actual_cost),
    currencyCode: text(row.club_currency_code) || 'EUR',
    imageUrl,
    serviceAvailable: yesNo(row.service_available),
    showCost: row.show_cost == null ? true : yesNo(row.show_cost),
    videoUrl: text(row.video_url),
    orderPosition: Number(row.order_position ?? 0),
    created: toIsoDate(row.created),
    modified: toIsoDate(row.modified)
  };
}

async function getNextOrderPosition(tableName: string, context: AuthorizedContext): Promise<number> {
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ max_position: number | bigint | null }[]>(
    `SELECT MAX(COALESCE(order_position, 0)) AS max_position
     FROM \`${tableName}\`
     WHERE user_id IN (${userPlaceholders})`,
    ...context.userIds
  );

  return Number(rows[0]?.max_position ?? 0) + 1;
}

async function applyManualOrder(
  serviceTable: string,
  context: AuthorizedContext,
  orders: { id: string; orderPosition: number }[]
): Promise<number> {
  let updatedCount = 0;

  for (const order of orders) {
    if (!order.id || !Number.isFinite(order.orderPosition) || order.orderPosition < 1) continue;

    const existing = await getOwnedService(serviceTable, context, order.id);
    if (!existing) continue;

    await prisma.$executeRawUnsafe(
      `UPDATE \`${serviceTable}\`
       SET order_position = ?,
           modified = CURRENT_TIMESTAMP
       WHERE id = ?`,
      order.orderPosition,
      order.id
    );
    updatedCount += 1;
  }

  return updatedCount;
}

async function applyAlphabeticalOrder(
  serviceTable: string,
  sectorTable: string,
  context: AuthorizedContext,
  sortBy: 'sector' | 'service'
): Promise<number> {
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const orderClause = sortBy === 'sector'
    ? 'sector.sector_name ASC, svc.service_name ASC, svc.id ASC'
    : 'svc.service_name ASC, svc.id ASC';

  const rows = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT svc.id
     FROM \`${serviceTable}\` svc
     LEFT JOIN \`${sectorTable}\` sector
       ON CAST(sector.id AS CHAR) = CAST(svc.sector_id AS CHAR)
     WHERE svc.user_id IN (${userPlaceholders})
     ORDER BY ${orderClause}`,
    ...context.userIds
  );

  for (let index = 0; index < rows.length; index += 1) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${serviceTable}\`
       SET order_position = ?,
           modified = CURRENT_TIMESTAMP
       WHERE id = ?`,
      index + 1,
      String(rows[index].id)
    );
  }

  return rows.length;
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const sectorTable = await ensureSectorTable();
    const serviceTable = await ensureServicesTable();
    const userPlaceholders = context.userIds.map(() => '?').join(',');

    const sectors = await prisma.$queryRawUnsafe<SectorRow[]>(
      `SELECT id, sector_name
       FROM \`${sectorTable}\`
       ORDER BY sector_name ASC, id ASC`
    );

    const rows = await prisma.$queryRawUnsafe<ServiceRow[]>(
      `SELECT svc.id, svc.user_id, svc.club_id, svc.sector_id, svc.service_name,
              svc.club_currency_cost, svc.actual_cost, svc.club_currency_code,
              svc.service_img, svc.service_available, svc.show_cost, svc.video_url,
              svc.order_position, svc.created, svc.modified,
              sector.sector_name
       FROM \`${serviceTable}\` svc
       LEFT JOIN \`${sectorTable}\` sector
         ON CAST(sector.id AS CHAR) = CAST(svc.sector_id AS CHAR)
       WHERE svc.user_id IN (${userPlaceholders})
       ORDER BY COALESCE(svc.order_position, 999999) ASC, svc.id ASC`,
      ...context.userIds
    );

    const currencyCode = text(rows.find((row) => row.club_currency_code)?.club_currency_code) || 'EUR';

    return NextResponse.json({
      club: context.club,
      currency: { code: currencyCode },
      sectors: sectors.map(normalizeSector),
      items: rows.map(normalizeService)
    });
  } catch (error) {
    console.error('GET /api/club/settings/tables/special-services:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const sectorTable = await ensureSectorTable();
    const serviceTable = await ensureServicesTable();
    const payload = parsePayload(await request.formData());
    const fieldErrors = await validatePayload(sectorTable, payload);

    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(serviceTable, context, payload))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { serviceName: 'This service already exists in the selected sector.' }
      }, { status: 409 });
    }

    let imagePath: string | null = null;
    if (payload.image) {
      const imageResult = await saveServiceImage(payload.image);
      if ('error' in imageResult) {
        return NextResponse.json({ error: imageResult.error, fieldErrors: { image: imageResult.error } }, { status: 400 });
      }
      imagePath = imageResult.path;
    }

    const storageUserId = context.legacyUserId ?? context.userId;
    const cost = String(Number(payload.cost));
    const actualCost = getActualCost(cost);
    const orderPosition = await getNextOrderPosition(serviceTable, context);

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${serviceTable}\`
         (user_id, club_id, sector_id, service_name, club_currency_cost, actual_cost,
          club_currency_code, service_img, order_position)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      storageUserId,
      context.club?.id ?? null,
      payload.sectorId,
      payload.serviceName,
      cost,
      actualCost,
      'EUR',
      imagePath,
      orderPosition
    );

    const idRows = await prisma.$queryRawUnsafe<{ id: bigint | number | string }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );

    return NextResponse.json({
      success: true,
      item: {
        id: String(idRows[0]?.id ?? ''),
        sectorId: payload.sectorId,
        serviceName: payload.serviceName,
        cost,
        actualCost,
        currencyCode: 'EUR',
        imageUrl: imagePath
      }
    }, { status: 201 });
  } catch (error) {
    console.error('POST /api/club/settings/tables/special-services:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let uploadedImagePath: string | null = null;

  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const sectorTable = await ensureSectorTable();
    const serviceTable = await ensureServicesTable();
    const formData = await request.formData();
    const id = text(formData.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 });
    }

    const existing = await getOwnedService(serviceTable, context, id);
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    const payload = parsePayload(formData);
    const fieldErrors = await validatePayload(sectorTable, payload);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    if (!(await ensureNoDuplicate(serviceTable, context, payload, id))) {
      return NextResponse.json({
        error: 'Duplicate value',
        fieldErrors: { serviceName: 'This service already exists in the selected sector.' }
      }, { status: 409 });
    }

    let imagePath = normalizeServiceImagePath(existing.service_img);
    if (payload.image) {
      const imageResult = await saveServiceImage(payload.image);
      if ('error' in imageResult) {
        return NextResponse.json({ error: imageResult.error, fieldErrors: { image: imageResult.error } }, { status: 400 });
      }
      uploadedImagePath = imageResult.path;
      imagePath = imageResult.path;
    } else if (payload.removeImage) {
      imagePath = null;
    }

    const cost = String(Number(payload.cost));
    const actualCost = getActualCost(cost);
    const currencyCode = text(existing.club_currency_code) || 'EUR';

    await prisma.$executeRawUnsafe(
      `UPDATE \`${serviceTable}\`
       SET sector_id = ?,
           service_name = ?,
           club_currency_cost = ?,
           actual_cost = ?,
           club_currency_code = ?,
           service_img = ?,
           modified = CURRENT_TIMESTAMP
       WHERE id = ?`,
      payload.sectorId,
      payload.serviceName,
      cost,
      actualCost,
      currencyCode,
      imagePath,
      id
    );

    if (uploadedImagePath || payload.removeImage) {
      await deleteServiceImage(existing.service_img);
    }

    return NextResponse.json({
      success: true,
      item: {
        id,
        sectorId: payload.sectorId,
        serviceName: payload.serviceName,
        cost,
        actualCost,
        currencyCode,
        imageUrl: imagePath
      }
    });
  } catch (error) {
    if (uploadedImagePath) {
      await deleteServiceImage(uploadedImagePath);
    }

    console.error('PUT /api/club/settings/tables/special-services:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const body = await request.json().catch(() => ({}));
    const sectorTable = await ensureSectorTable();
    const serviceTable = await ensureServicesTable();

    const rawOrders = (body as Record<string, unknown>)?.orders;
    if (Array.isArray(rawOrders)) {
      const orders = rawOrders
        .map((entry) => {
          const row = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {};
          return {
            id: text(row.id),
            orderPosition: Number(row.orderPosition ?? row.order_position)
          };
        })
        .filter((entry) => entry.id && Number.isFinite(entry.orderPosition));

      if (orders.length === 0) {
        return NextResponse.json({ error: 'No valid order data provided' }, { status: 400 });
      }

      const updatedCount = await applyManualOrder(serviceTable, context, orders);
      return NextResponse.json({
        success: true,
        updatedCount,
        message: 'Order updated successfully.'
      });
    }

    const sortBy = text((body as Record<string, unknown>)?.sortBy);
    if (sortBy === 'sector' || sortBy === 'service') {
      const updatedCount = await applyAlphabeticalOrder(serviceTable, sectorTable, context, sortBy);
      return NextResponse.json({
        success: true,
        sortBy,
        updatedCount,
        message: sortBy === 'sector'
          ? 'Services sorted by sector name.'
          : 'Services sorted by service name.'
      });
    }

    return NextResponse.json({ error: 'Provide orders or sortBy' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/club/settings/tables/special-services:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const serviceTable = await ensureServicesTable();
    const id = text(request.nextUrl.searchParams.get('id'));
    if (!id) {
      return NextResponse.json({ error: 'Service id is required' }, { status: 400 });
    }

    const existing = await getOwnedService(serviceTable, context, id);
    if (!existing) {
      return NextResponse.json({ error: 'Service not found' }, { status: 404 });
    }

    await prisma.$executeRawUnsafe(
      `DELETE FROM \`${serviceTable}\` WHERE id = ?`,
      id
    );
    await deleteServiceImage(existing.service_img);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/club/settings/tables/special-services:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
