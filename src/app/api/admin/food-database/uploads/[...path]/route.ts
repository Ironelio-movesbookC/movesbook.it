import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, normalize } from 'path';

const UPLOAD_ROOT = join(process.cwd(), 'public', 'uploads', 'food-database');

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
};

/** Serve uploaded food images (img tags cannot send Authorization headers). */
export async function GET(
  _request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    const relative = params.path.join('/');
    if (!relative || relative.includes('..')) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const filePath = normalize(join(UPLOAD_ROOT, relative));
    if (!filePath.startsWith(normalize(UPLOAD_ROOT))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const buffer = await readFile(filePath);
    const ext = relative.split('.').pop()?.toLowerCase() || 'jpg';
    const contentType = MIME[ext] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('food-database uploads GET:', error);
    return NextResponse.json({ error: 'Failed to load image' }, { status: 500 });
  }
}
