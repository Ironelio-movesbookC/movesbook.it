import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma, prismaConnect, resetPrismaClient } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Incoming file size limit (same as operator photo). */
const MAX_BYTES = 2 * 1024 * 1024;
/** Avatar display size — keep data URL well under MySQL max_allowed_packet. */
const AVATAR_MAX_EDGE = 512;
const AVATAR_JPEG_QUALITY = 82;

let imageColumnEnsured = false;

function isClosedConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const e = error as { code?: string; message?: string };
  return (
    e.code === 'P1017' ||
    e.code === 'P1001' ||
    /Server has closed the connection/i.test(e.message || '') ||
    /Can't reach database server/i.test(e.message || '')
  );
}

/**
 * Ensure `users_new.image` can hold data URLs (like staff_accounts.imageUrl LongText).
 * DDL invalidates pooled connections — reset Prisma after ALTER.
 */
async function ensureUserImageLongText(): Promise<void> {
  if (imageColumnEnsured) return;

  try {
    const cols = await prisma.$queryRawUnsafe<{ DATA_TYPE: string }[]>(
      `SELECT DATA_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users_new'
         AND COLUMN_NAME = 'image'
       LIMIT 1`,
    );
    const type = (cols[0]?.DATA_TYPE || '').toLowerCase();
    if (type && type !== 'longtext' && type !== 'mediumtext') {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`users_new\` MODIFY COLUMN \`image\` LONGTEXT NULL`,
      );
      await resetPrismaClient();
      await prismaConnect();
    }
  } catch (e) {
    console.warn('ensureUserImageLongText:', e);
    // Any failed DDL/raw query can leave the pool dead — always reconnect once.
    await resetPrismaClient();
    await prismaConnect();
  }

  imageColumnEnsured = true;
}

/** Resize + JPEG-encode so the stored data URL stays small (no max_allowed_packet hacks). */
async function toAvatarDataUrl(input: Buffer): Promise<string> {
  const jpeg = await sharp(input)
    .rotate()
    .resize(AVATAR_MAX_EDGE, AVATAR_MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: AVATAR_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

async function saveUserImage(userId: string, dataUrl: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { image: dataUrl },
    select: { id: true, image: true },
  });
}

/**
 * Athlete profile photo — same storage model as operator photo (data URL in DB),
 * with sharp compression so MySQL accepts the packet without raising max_allowed_packet.
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const form = await request.formData().catch(() => null);
    if (!form) {
      return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
    }

    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'file is required' }, { status: 400 });
    }

    if (!file.type?.startsWith('image/')) {
      return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: 'Image is too large (max 2MB)' }, { status: 413 });
    }

    await ensureUserImageLongText();

    let dataUrl: string;
    try {
      dataUrl = await toAvatarDataUrl(buffer);
    } catch {
      return NextResponse.json({ error: 'Invalid or unsupported image file' }, { status: 400 });
    }

    let updated;
    try {
      updated = await saveUserImage(decoded.userId, dataUrl);
    } catch (firstError) {
      if (!isClosedConnectionError(firstError)) throw firstError;
      await resetPrismaClient();
      await prismaConnect();
      updated = await saveUserImage(decoded.userId, dataUrl);
    }

    return NextResponse.json({
      success: true,
      imageUrl: updated.image,
      path: updated.image,
    });
  } catch (error: unknown) {
    console.error('Error uploading profile avatar:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to upload profile photo', details: message },
      { status: 500 },
    );
  }
}
