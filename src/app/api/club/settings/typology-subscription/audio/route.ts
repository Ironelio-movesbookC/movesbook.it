import { NextRequest, NextResponse } from 'next/server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { join } from 'path';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { verifyPublicFile } from '@/lib/serverPublicDir';
import { typologyAudioPublicUrl } from '@/lib/typologySubscriptionAudio.shared';
import {
  buildTypologyAudioFileName,
  normalizeTypologyAudioExtension,
  typologyAudioUserDir
} from '@/lib/typologySubscriptionAudio';

export const dynamic = 'force-dynamic';

const TYPOLOGY_TABLE_CANDIDATES = ['club_setting_subscription_typologies', 'club_setting_subscription_typology'];
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

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

async function fetchTypologySong(
  typologyId: string,
  userId: string
): Promise<{ table: string; song: string | null; storageUserId: string } | null> {
  const table = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!table) return null;

  const columns = await getTableColumns(table);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT *
     FROM \`${table}\`
     WHERE id = ?
       AND user_id = ?
     LIMIT 1`,
    typologyId,
    userId
  );
  const row = rows[0];
  if (!row) return null;

  const storageUserId = text(row.user_id) || userId;
  const song = columns.has('song') ? text(row.song) || null : null;
  return { table, song, storageUserId };
}

async function removeTypologyAudioFile(storageUserId: string, fileName: string) {
  const filePath = join(typologyAudioUserDir(storageUserId), fileName);
  try {
    await unlink(filePath);
  } catch {
    /* missing file is fine */
  }
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
    const typologyId = text(formData.get('typologyId'));
    const file = formData.get('file');

    if (!typologyId) {
      return NextResponse.json({ error: 'Typology id is required.' }, { status: 400 });
    }
    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No audio file provided.' }, { status: 400 });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio file exceeds 25MB.' }, { status: 400 });
    }
    if (file.size === 0) {
      return NextResponse.json({ error: 'The uploaded file is empty.' }, { status: 400 });
    }

    const uploadFileName = file instanceof File ? file.name : 'upload.mp3';
    const extension = normalizeTypologyAudioExtension(uploadFileName);
    if (!extension) {
      return NextResponse.json({ error: 'Only .mp3, .mp4, .wav, or recorded .webm files are allowed.' }, { status: 400 });
    }

    const existing = await fetchTypologySong(typologyId, String(decoded.userId));
    if (!existing) {
      return NextResponse.json({ error: 'Typology not found.' }, { status: 404 });
    }

    const columns = await getTableColumns(existing.table);
    if (!columns.has('song')) {
      return NextResponse.json({ error: 'Song column not found on typology table.' }, { status: 500 });
    }

    const fileName = buildTypologyAudioFileName(extension);
    const uploadDir = typologyAudioUserDir(existing.storageUserId);
    await mkdir(uploadDir, { recursive: true });
    const savedPath = join(uploadDir, fileName);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(savedPath, buffer);

    if (!(await verifyPublicFile(savedPath))) {
      return NextResponse.json(
        { error: 'Audio upload could not be verified on disk. Check server public directory configuration.' },
        { status: 500 }
      );
    }

    await prisma.$executeRawUnsafe(
      `UPDATE \`${existing.table}\` SET song = ? WHERE id = ? AND user_id = ?`,
      fileName,
      typologyId,
      decoded.userId
    );

    if (existing.song && existing.song !== fileName) {
      await removeTypologyAudioFile(existing.storageUserId, existing.song);
    }

    const audioUrl = typologyAudioPublicUrl(existing.storageUserId, fileName);
    return NextResponse.json({
      success: true,
      fileName,
      song: fileName,
      audioUrl,
      message: 'Audio successfully saved.'
    });
  } catch (error) {
    console.error('POST /api/club/settings/typology-subscription/audio:', error);
    return NextResponse.json({ error: 'Audio upload failed.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const decoded = getTokenPayload(request);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isClubAccountUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const typologyId = text(request.nextUrl.searchParams.get('typologyId'));
    if (!typologyId) {
      return NextResponse.json({ error: 'Typology id is required.' }, { status: 400 });
    }

    const existing = await fetchTypologySong(typologyId, String(decoded.userId));
    if (!existing) {
      return NextResponse.json({ error: 'Typology not found.' }, { status: 404 });
    }

    if (existing.song) {
      await removeTypologyAudioFile(existing.storageUserId, existing.song);
    }

    await prisma.$executeRawUnsafe(
      `UPDATE \`${existing.table}\` SET song = NULL WHERE id = ? AND user_id = ?`,
      typologyId,
      decoded.userId
    );

    return NextResponse.json({ success: true, message: 'Audio successfully deleted.' });
  } catch (error) {
    console.error('DELETE /api/club/settings/typology-subscription/audio:', error);
    return NextResponse.json({ error: 'Audio delete failed.' }, { status: 500 });
  }
}
