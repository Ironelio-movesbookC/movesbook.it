import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { randomUUID } from 'crypto';
import { verifyToken } from '@/lib/auth';
import { MAX_ATTACHMENT_BYTES } from '@/lib/periodizationAttachments';

const ALLOWED_MIMES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp'
]);

function safeBasename(name: string): string {
  const base = (name || 'file').split(/[/\\]/).pop() || 'file';
  return base.replace(/[^a-zA-Z0-9._-]+/g, '_').slice(0, 120) || 'file';
}

function isUserPeriodizationPath(userId: string, url: string): boolean {
  const prefix = `/uploads/periodization/${userId}/`;
  return typeof url === 'string' && url.startsWith(prefix) && !url.includes('..');
}

/** POST — multipart field `file`; optional `periodId` (stored in response only for client). */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    const userId = decoded?.userId;
    if (!userId || userId === 'admin') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    if (file.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: 'File exceeds 10MB limit' }, { status: 400 });
    }
    const mime = file.type || 'application/octet-stream';
    if (!ALLOWED_MIMES.has(mime)) {
      return NextResponse.json(
        { error: 'Unsupported type. Use PDF, Word, text, or common images.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const id = randomUUID();
    const base = safeBasename(file.name);
    const ext = base.includes('.') ? base.slice(base.lastIndexOf('.')) : '';
    const fileName = `${id}${ext || '.bin'}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'periodization', userId);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/periodization/${userId}/${fileName}`;
    const uploadedAt = new Date().toISOString();

    return NextResponse.json({
      attachment: {
        id,
        name: file.name || base,
        url: publicPath,
        mimeType: mime,
        size: file.size,
        uploadedAt
      }
    });
  } catch (e) {
    console.error('periodization-attachment POST:', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}

/** DELETE — JSON body `{ "url": "/uploads/periodization/<userId>/..." }` */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    const userId = decoded?.userId;
    if (!userId || userId === 'admin') {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const url = typeof body?.url === 'string' ? body.url : '';
    if (!isUserPeriodizationPath(userId, url)) {
      return NextResponse.json({ error: 'Invalid path' }, { status: 400 });
    }

    const relative = url.replace(/^\/+/, '');
    const diskPath = join(process.cwd(), 'public', relative);
    if (existsSync(diskPath)) {
      await unlink(diskPath);
    }
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('periodization-attachment DELETE:', e);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
