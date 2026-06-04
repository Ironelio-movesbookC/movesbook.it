import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { verifyToken } from '@/lib/auth';
import { getServerPublicDir } from '@/lib/serverPublicDir';

export const dynamic = 'force-dynamic';

const MAX_ICON_BYTES = 5 * 1024 * 1024;
const TYPOLOGY_ICON_DIR = ['img', 'typology_image'];
const ALLOWED_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif',
  'image/bmp',
  'image/x-ms-bmp'
]);
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp']);
const ALLOWED_FORMATS_ERROR = 'Only JPG, PNG, GIF, or BMP icons are allowed';

type TypologyIconExtension = '.png' | '.jpg' | '.gif' | '.bmp';

const CAT_ICON_FILE_PATTERN = /^Cat_(\d+)\.(png|jpe?g|gif|bmp)$/i;

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

function normalizeExtension(fileName: string): TypologyIconExtension | null {
  const extension = extname(fileName).toLowerCase();
  if (extension === '.jpeg') return '.jpg';
  if (!ALLOWED_EXTENSIONS.has(extension)) return null;
  return extension as TypologyIconExtension;
}

/** Detect PNG/JPEG/GIF/BMP from magic bytes (do not trust filename or MIME alone). */
function detectImageFormat(buffer: Buffer): TypologyIconExtension | null {
  if (
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return '.png';
  }

  if (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    return '.jpg';
  }

  if (
    buffer.length > 6 &&
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return '.gif';
  }

  if (buffer.length > 2 && buffer[0] === 0x42 && buffer[1] === 0x4d) {
    return '.bmp';
  }

  return null;
}

async function getNextCatFileName(uploadDir: string, extension: TypologyIconExtension) {
  const files = await readdir(uploadDir).catch(() => []);
  const highestNumber = files.reduce((highest, fileName) => {
    const match = fileName.match(CAT_ICON_FILE_PATTERN);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]) || 0);
  }, 0);

  return `Cat_${highestNumber + 1}${extension}`;
}

async function writeNextCatIcon(
  uploadDir: string,
  extension: TypologyIconExtension,
  buffer: Buffer
) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const fileName = await getNextCatFileName(uploadDir, extension);

    try {
      await writeFile(join(uploadDir, fileName), buffer, { flag: 'wx' });
      return fileName;
    } catch (error) {
      const code = error instanceof Error && 'code' in error
        ? (error as { code?: string }).code
        : undefined;

      if (code === 'EEXIST') continue;
      throw error;
    }
  }

  throw new Error('Unable to reserve a typology icon filename');
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
    const file = formData.get('file');

    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No icon file provided' }, { status: 400 });
    }

    if (file.size > MAX_ICON_BYTES) {
      return NextResponse.json({ error: 'Icon file exceeds 5MB' }, { status: 400 });
    }

    const uploadFileName = file instanceof File ? file.name : 'upload.png';
    const nameExtension = normalizeExtension(uploadFileName);
    if (!nameExtension) {
      return NextResponse.json({ error: ALLOWED_FORMATS_ERROR }, { status: 400 });
    }

    if (
      file.type &&
      file.type !== 'application/octet-stream' &&
      !ALLOWED_MIME_TYPES.has(file.type)
    ) {
      return NextResponse.json({ error: ALLOWED_FORMATS_ERROR }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json(
        { error: 'The uploaded file is empty. Check server/proxy upload limits.' },
        { status: 400 }
      );
    }

    const detectedFormat = detectImageFormat(buffer);
    if (!detectedFormat) {
      return NextResponse.json({ error: 'The selected file is not a valid image icon' }, { status: 400 });
    }

    const extension = detectedFormat;

    const uploadDir = join(getServerPublicDir(), ...TYPOLOGY_ICON_DIR);
    await mkdir(uploadDir, { recursive: true });

    const fileName = await writeNextCatIcon(uploadDir, extension, buffer);

    return NextResponse.json({
      success: true,
      image: fileName,
      fileName,
      url: `/img/typology_image/${fileName}`,
      path: `/img/typology_image/${fileName}`
    });
  } catch (error) {
    console.error('POST /api/club/settings/typology-subscription/icon:', error);
    return NextResponse.json({ error: 'Icon upload failed' }, { status: 500 });
  }
}
