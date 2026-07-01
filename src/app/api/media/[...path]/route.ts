import { readFile, stat } from 'fs/promises';
import { join, normalize, sep } from 'path';
import { NextRequest, NextResponse } from 'next/server';
import { getServerPublicDir } from '@/lib/serverPublicDir';

export const dynamic = 'force-dynamic';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
};

function contentTypeForPath(filePath: string): string {
  const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
  return MIME_BY_EXT[ext] ?? 'application/octet-stream';
}

function resolveUploadFilePath(segments: string[]): string | null {
  if (!segments.length) return null;
  if (segments.some((part) => part === '..' || part === '.' || !part)) return null;
  if (segments[0] !== 'uploads') return null;

  const publicRoot = normalize(getServerPublicDir());
  const absolute = normalize(join(publicRoot, ...segments));
  const uploadsRoot = normalize(join(publicRoot, 'uploads'));

  if (!absolute.startsWith(`${uploadsRoot}${sep}`) && absolute !== uploadsRoot) {
    return null;
  }

  return absolute;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments } = await context.params;
    const filePath = resolveUploadFilePath(segments);
    if (!filePath) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const info = await stat(filePath);
    if (!info.isFile() || info.size === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await readFile(filePath);
    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': contentTypeForPath(filePath),
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
