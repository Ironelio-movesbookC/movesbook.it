import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { prisma, prismaConnect, resetPrismaClient } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
/** Wide enough for covers; compressed so data URLs fit MySQL packets. */
const BANNER_MAX_WIDTH = 1600;
const BANNER_JPEG_QUALITY = 78;

let bannerColumnsEnsured = false;

async function ensureBannerLongTextColumns(): Promise<void> {
  if (bannerColumnsEnsured) return;
  try {
    const cols = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string; DATA_TYPE: string }[]>(
      `SELECT COLUMN_NAME, DATA_TYPE
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'users_new'
         AND COLUMN_NAME IN ('profileBanner', 'profileBannerSequence')`,
    );
    let altered = false;
    for (const col of cols) {
      const type = (col.DATA_TYPE || '').toLowerCase();
      if (type && type !== 'longtext' && type !== 'mediumtext') {
        await prisma.$executeRawUnsafe(
          `ALTER TABLE \`users_new\` MODIFY COLUMN \`${col.COLUMN_NAME}\` LONGTEXT NULL`,
        );
        altered = true;
      }
    }
    if (altered) {
      await resetPrismaClient();
      await prismaConnect();
    }
  } catch (e) {
    console.warn('ensureBannerLongTextColumns:', e);
    await resetPrismaClient();
    await prismaConnect();
  }
  bannerColumnsEnsured = true;
}

async function toBannerDataUrl(input: Buffer): Promise<string> {
  const jpeg = await sharp(input)
    .rotate()
    .resize(BANNER_MAX_WIDTH, undefined, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: BANNER_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();

  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

/**
 * Profile banner upload — same storage model as avatar/operator photo:
 * return a compressed data URL (no filesystem write). Caller PATCHes
 * `/api/user/profile` to persist (single banner or sequence).
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
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 413 });
    }

    await ensureBannerLongTextColumns();

    let dataUrl: string;
    try {
      dataUrl = await toBannerDataUrl(buffer);
    } catch {
      return NextResponse.json({ error: 'Invalid or unsupported image file' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      path: dataUrl,
      imageUrl: dataUrl,
    });
  } catch (error: unknown) {
    console.error('Error uploading profile banner:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to upload banner', details: message }, { status: 500 });
  }
}
