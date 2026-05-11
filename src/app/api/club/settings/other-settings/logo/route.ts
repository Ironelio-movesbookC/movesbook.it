import { mkdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { getServerPublicDir } from '@/lib/serverPublicDir';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const DOCUMENT_LOGO_DIR = ['img', 'document_logo'];
const TABLE_NAME = 'club_reader_other_settings';
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']);
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp']);

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
  return base.slice(0, 40) || 'logo';
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

async function ensureLogoColumns() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      club_user_id VARCHAR(191) NULL,
      club_id VARCHAR(191) NULL,
      document_logo VARCHAR(255) NULL,
      document_logo1 VARCHAR(255) NULL,
      document_logo2 VARCHAR(255) NULL,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_club_reader_other_settings_logo_user_club (club_user_id, club_id)
    )
  `);

  const columns = await getTableColumns(TABLE_NAME);
  const definitions: Record<string, string> = {
    club_user_id: 'VARCHAR(191) NULL',
    club_id: 'VARCHAR(191) NULL',
    document_logo: 'VARCHAR(255) NULL',
    document_logo1: 'VARCHAR(255) NULL',
    document_logo2: 'VARCHAR(255) NULL',
    created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
  };

  for (const [column, definition] of Object.entries(definitions)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${column}\` ${definition}`);
    }
  }
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

async function getOwnedClub(userId: string) {
  const fallback = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name
    FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  return fallback[0] ?? null;
}

async function saveLogoFilename(userId: string, fileName: string, slot: 'document_logo1' | 'document_logo2', selected: boolean) {
  await ensureLogoColumns();

  const legacyUserId = await getLegacyUserId(userId);
  const userIds = Array.from(new Set([userId, legacyUserId].filter(Boolean) as string[]));
  const storageUserId = legacyUserId ?? userId;
  const club = await getOwnedClub(userId);
  const clubId = club?.id ?? null;
  const userPlaceholders = userIds.map(() => '?').join(',');

  const existing = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT id
     FROM \`${TABLE_NAME}\`
     WHERE club_user_id IN (${userPlaceholders})
       ${clubId ? 'AND club_id = ?' : ''}
     ORDER BY id DESC
     LIMIT 1`,
    ...userIds,
    ...(clubId ? [clubId] : [])
  );

  if (existing[0]) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${TABLE_NAME}\`
       SET \`${slot}\` = ?,
           ${selected ? 'document_logo = ?,' : ''}
           modified = CURRENT_TIMESTAMP
       WHERE id = ?`,
      fileName,
      ...(selected ? [fileName] : []),
      existing[0].id
    );
    return;
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${TABLE_NAME}\`
       (club_user_id, club_id, \`${slot}\`, document_logo)
     VALUES (?, ?, ?, ?)`,
    storageUserId,
    clubId,
    fileName,
    selected ? fileName : ''
  );
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getTokenPayload(request);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isClubAccountUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const slot = formData.get('slot') === 'documentLogo2' ? 'document_logo2' : 'document_logo1';
    const selected = formData.get('selected') === '1';

    if (!file) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 });
    }

    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: 'Logo file exceeds 5MB' }, { status: 400 });
    }

    const extension = normalizeExtension(file.name);
    if (!extension) {
      return NextResponse.json({ error: 'Only PNG, JPG, GIF, or WEBP logos are allowed' }, { status: 400 });
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only PNG, JPG, GIF, or WEBP logos are allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(buffer, extension)) {
      return NextResponse.json({ error: 'The selected file is not a valid logo image' }, { status: 400 });
    }

    const uploadDir = join(getServerPublicDir(), ...DOCUMENT_LOGO_DIR);
    await mkdir(uploadDir, { recursive: true });

    const fileName = `Logo_${Date.now()}_${safeBaseName(file.name)}${extension}`;
    await writeFile(join(uploadDir, fileName), buffer, { flag: 'wx' });
    await saveLogoFilename(String(decoded.userId), fileName, slot, selected);

    return NextResponse.json({
      success: true,
      image: fileName,
      fileName,
      url: `/img/document_logo/${fileName}`,
      path: `/img/document_logo/${fileName}`
    });
  } catch (error) {
    console.error('POST /api/club/settings/other-settings/logo:', error);
    return NextResponse.json({ error: 'Logo upload failed' }, { status: 500 });
  }
}
