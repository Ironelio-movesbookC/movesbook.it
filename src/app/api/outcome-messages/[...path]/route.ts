import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { resolveOutcomeAudioDiskPath } from '@/lib/serverPublicDir';

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

async function fetchLegacyOutcomeAudio(
  segments: string[]
): Promise<{ body: Buffer; mime: string } | null> {
  const legacyOrigin = process.env.MOVESBOOK_LEGACY_ORIGIN?.trim();
  if (!legacyOrigin) return null;

  const url = `${legacyOrigin.replace(/\/$/, '')}/outcome_messages/${segments.join('/')}`;
  try {
    const response = await fetch(url, { next: { revalidate: 0 } });
    if (!response.ok) return null;

    const body = Buffer.from(await response.arrayBuffer());
    if (body.length === 0) return null;

    const filename = segments[segments.length - 1] ?? '';
    const mime = response.headers.get('content-type') || mimeForFilename(filename) || 'audio/mpeg';
    return { body, mime };
  } catch {
    return null;
  }
}

function audioResponse(body: Buffer, mime: string): NextResponse {
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': mime,
      'Content-Length': String(body.length),
      'Cache-Control': 'public, max-age=86400, immutable',
    },
  });
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

    const diskPath = await resolveOutcomeAudioDiskPath(...segments);
    if (diskPath) {
      const buffer = await readFile(diskPath);
      return audioResponse(buffer, mime);
    }

    const legacy = await fetchLegacyOutcomeAudio(segments);
    if (legacy) {
      return audioResponse(legacy.body, legacy.mime);
    }

    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  } catch (error) {
    console.error('GET /api/outcome-messages:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
