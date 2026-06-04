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
import {
  formatUploadCause,
  typologyUploadError,
  typologyUploadSuccess
} from '@/lib/typologyUploadResponse';

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

function resolveAudioSource(
  formSource: unknown,
  uploadFileName: string
): 'import' | 'recording' {
  const source = text(formSource).toLowerCase();
  if (source === 'recording' || source === 'import') return source;
  if (/^recording-/i.test(uploadFileName) || uploadFileName.toLowerCase().endsWith('.webm')) {
    return 'recording';
  }
  return 'import';
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
  let uploadDir = '';
  let typologyId = '';
  let source: 'import' | 'recording' = 'import';

  try {
    const decoded = getTokenPayload(request);
    if (!decoded?.userId || !decoded.userType) {
      return typologyUploadError('Unauthorized', 401, {
        kind: 'typology-audio',
        uploadDir: uploadDir || 'unknown'
      });
    }
    if (!isClubAccountUserType(String(decoded.userType))) {
      return typologyUploadError('Forbidden', 403, {
        kind: 'typology-audio',
        uploadDir: uploadDir || 'unknown'
      });
    }

    const formData = await request.formData();
    typologyId = text(formData.get('typologyId'));
    const file = formData.get('file');
    const uploadFileName = file instanceof File ? file.name : 'upload.mp3';
    source = resolveAudioSource(formData.get('source'), uploadFileName);

    if (!typologyId) {
      return typologyUploadError('Typology id is required.', 400, {
        kind: 'typology-audio',
        uploadDir: uploadDir || 'unknown',
        source
      });
    }
    if (!file || typeof file === 'string' || !(file instanceof Blob)) {
      return typologyUploadError('No audio file provided.', 400, {
        kind: 'typology-audio',
        typologyId,
        source
      });
    }
    if (file.size > MAX_AUDIO_BYTES) {
      return typologyUploadError('Audio file exceeds 25MB.', 400, {
        kind: 'typology-audio',
        typologyId,
        source,
        bytesWritten: file.size
      });
    }
    if (file.size === 0) {
      return typologyUploadError('The uploaded file is empty.', 400, {
        kind: 'typology-audio',
        typologyId,
        source
      });
    }

    const extension = normalizeTypologyAudioExtension(uploadFileName);
    if (!extension) {
      return typologyUploadError(
        'Only .mp3, .mp4, .wav, or recorded .webm files are allowed.',
        400,
        { kind: 'typology-audio', typologyId, source }
      );
    }

    const existing = await fetchTypologySong(typologyId, String(decoded.userId));
    if (!existing) {
      return typologyUploadError('Typology not found.', 404, {
        kind: 'typology-audio',
        typologyId,
        source
      });
    }

    const columns = await getTableColumns(existing.table);
    if (!columns.has('song')) {
      return typologyUploadError('Song column not found on typology table.', 500, {
        kind: 'typology-audio',
        typologyId,
        storageUserId: existing.storageUserId,
        source
      });
    }

    uploadDir = typologyAudioUserDir(existing.storageUserId);
    const fileName = buildTypologyAudioFileName(extension);
    const savedPath = join(uploadDir, fileName);
    const servedUrl = typologyAudioPublicUrl(existing.storageUserId, fileName);

    await mkdir(uploadDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(savedPath, buffer);

    const verified = await verifyPublicFile(savedPath);
    if (!verified) {
      return typologyUploadError(
        'Audio was written but could not be verified on disk. The file may be in a folder that Next.js does not serve.',
        500,
        {
          kind: 'typology-audio',
          uploadDir,
          savedPath,
          servedUrl,
          fileName,
          bytesWritten: buffer.length,
          verifiedOnDisk: false,
          typologyId,
          storageUserId: existing.storageUserId,
          source
        }
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

    return typologyUploadSuccess(
      'typology-audio',
      {
        message:
          source === 'recording'
            ? 'Recording saved on disk, database updated, and verified. Open Browser URL in details to confirm playback.'
            : 'Audio import saved on disk, database updated, and verified. Open Browser URL in details to confirm playback.',
        fileName,
        song: fileName,
        audioUrl: servedUrl
      },
      {
        uploadDir,
        savedPath,
        servedUrl,
        fileName,
        bytesWritten: buffer.length,
        verifiedOnDisk: true,
        typologyId,
        storageUserId: existing.storageUserId,
        source,
        dbSongUpdated: true
      }
    );
  } catch (error) {
    console.error('POST /api/club/settings/typology-subscription/audio:', error);
    return typologyUploadError('Audio upload failed.', 500, {
      kind: 'typology-audio',
      uploadDir: uploadDir || 'unknown',
      typologyId,
      source,
      cause: formatUploadCause(error)
    });
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
