import { NextRequest, NextResponse } from 'next/server';
import { mkdir, readdir, writeFile } from 'fs/promises';
import { extname, join } from 'path';
import { verifyToken } from '@/lib/auth';
import { getServerPublicDir } from '@/lib/serverPublicDir';

export const dynamic = 'force-dynamic';

const MAX_ICON_BYTES = 5 * 1024 * 1024;
const TYPOLOGY_ICON_DIR = ['img', 'typology_image'];
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg']);
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

function normalizeExtension(fileName: string): '.png' | '.jpg' | null {
  const extension = extname(fileName).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) return null;
  return extension === '.png' ? '.png' : '.jpg';
}

function hasValidImageSignature(buffer: Buffer, extension: '.png' | '.jpg'): boolean {
  if (extension === '.png') {
    return (
      buffer.length > 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    );
  }

  return (
    buffer.length > 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  );
}

async function getNextCatFileName(uploadDir: string, extension: '.png' | '.jpg') {
  const files = await readdir(uploadDir).catch(() => []);
  const highestNumber = files.reduce((highest, fileName) => {
    const match = fileName.match(/^Cat_(\d+)\.(png|jpe?g)$/i);
    if (!match) return highest;
    return Math.max(highest, Number(match[1]) || 0);
  }, 0);

  return `Cat_${highestNumber + 1}${extension}`;
}

async function writeNextCatIcon(uploadDir: string, extension: '.png' | '.jpg', buffer: Buffer) {
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
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No icon file provided' }, { status: 400 });
    }

    if (file.size > MAX_ICON_BYTES) {
      return NextResponse.json({ error: 'Icon file exceeds 5MB' }, { status: 400 });
    }

    const extension = normalizeExtension(file.name);
    if (!extension) {
      return NextResponse.json({ error: 'Only PNG or JPG icons are allowed' }, { status: 400 });
    }

    if (file.type && !ALLOWED_MIME_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only PNG or JPG icons are allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!hasValidImageSignature(buffer, extension)) {
      return NextResponse.json({ error: 'The selected file is not a valid image icon' }, { status: 400 });
    }

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
