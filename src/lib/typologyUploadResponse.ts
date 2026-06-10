import { NextResponse } from 'next/server';
import { getServerPublicDir } from '@/lib/serverPublicDir';
import type { TypologyUploadDetails, TypologyUploadKind } from '@/lib/typologyUploadResponse.shared';

const PUBLIC_DIR_HINT =
  'Next.js serves static files from publicDir. If the browser URL 404s, publicDir may be wrong (e.g. next start uses project/public, not .next/standalone/public). Set MOVESBOOK_PUBLIC_DIR to the served public folder.';

export function formatUploadCause(error: unknown): string {
  if (error instanceof Error) {
    const code =
      'code' in error && typeof (error as NodeJS.ErrnoException).code === 'string'
        ? (error as NodeJS.ErrnoException).code
        : '';
    return code ? `${error.message} (${code})` : error.message;
  }
  return String(error);
}

export function buildTypologyUploadDetails(
  kind: TypologyUploadKind,
  params: {
    uploadDir: string;
    savedPath?: string;
    servedUrl?: string;
    fileName?: string;
    bytesWritten?: number;
    verifiedOnDisk?: boolean;
    source?: 'import' | 'recording';
    typologyId?: string;
    storageUserId?: string;
    dbSongUpdated?: boolean;
    hint?: string;
    cause?: string;
  }
): TypologyUploadDetails {
  return {
    kind,
    publicDir: getServerPublicDir(),
    uploadDir: params.uploadDir,
    savedPath: params.savedPath,
    servedUrl: params.servedUrl,
    fileName: params.fileName,
    bytesWritten: params.bytesWritten,
    verifiedOnDisk: params.verifiedOnDisk,
    nodeEnv: process.env.NODE_ENV ?? 'unknown',
    cwd: process.cwd(),
    source: params.source,
    typologyId: params.typologyId,
    storageUserId: params.storageUserId,
    dbSongUpdated: params.dbSongUpdated,
    hint: params.hint,
    cause: params.cause
  };
}

export function typologyUploadError(
  error: string,
  status: number,
  details: Partial<TypologyUploadDetails> & { kind: TypologyUploadKind }
) {
  return NextResponse.json(
    {
      success: false,
      error,
      details: buildTypologyUploadDetails(details.kind, {
        uploadDir: details.uploadDir ?? getServerPublicDir(),
        savedPath: details.savedPath,
        servedUrl: details.servedUrl,
        fileName: details.fileName,
        bytesWritten: details.bytesWritten,
        verifiedOnDisk: details.verifiedOnDisk ?? false,
        source: details.source,
        typologyId: details.typologyId,
        storageUserId: details.storageUserId,
        hint: details.hint ?? PUBLIC_DIR_HINT,
        cause: details.cause
      })
    },
    { status }
  );
}

export function typologyUploadSuccess(
  kind: TypologyUploadKind,
  body: Record<string, unknown>,
  details: Parameters<typeof buildTypologyUploadDetails>[1]
) {
  return NextResponse.json({
    success: true,
    ...body,
    details: buildTypologyUploadDetails(kind, {
      ...details,
      hint: details.hint ?? PUBLIC_DIR_HINT
    })
  });
}
