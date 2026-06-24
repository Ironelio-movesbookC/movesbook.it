import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { normalize } from 'path';
import { resolvePublicPath } from '@/lib/serverPublicDir';

export const dynamic = 'force-dynamic';

const AUDIO_EXTENSIONS: Record<string, string> = {
  mp3: 'audio/mpeg',
  mpeg: 'audio/mpeg',
  wav: 'audio/wav',
};

function mimeForFilename(filename: string): string | null {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return AUDIO_EXTENSIONS[ext] ?? null;
}

function isSafeSegment(segment: string): boolean {
  return segment.length > 0 && !segment.includes('..') && !segment.includes('/') && !segment.includes('\\');
}

/** Serve uploaded outcome audio from the same public dir used by upload routes. */
export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const segments = params.path ?? [];
    if (segments.length < 2) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    for (const segment of segments) {
      if (!isSafeSegment(segment)) {
        return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
      }
    }

    const filename = segments[segments.length - 1]!;
    const mime = mimeForFilename(filename);
    if (!mime) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    const diskPath = normalize(resolvePublicPath('outcome_messages', ...segments));
    const root = normalize(resolvePublicPath('outcome_messages'));
    if (!diskPath.startsWith(root)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const info = await stat(diskPath);
    if (!info.isFile() || info.size === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = await readFile(diskPath);
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': mime,
        'Content-Length': String(info.size),
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    console.error('GET /api/outcome-messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
