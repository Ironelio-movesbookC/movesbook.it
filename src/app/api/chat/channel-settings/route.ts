import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { verifyToken } from '@/lib/auth';
import {
  clearOldChannelPhotos,
  ensureChatUploadDir,
  readChannelSettings,
  writeChannelSettings,
} from '@/lib/chat/channelSettings';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

function authorize(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const decoded = verifyToken(authHeader.replace('Bearer ', ''));
  if (!decoded?.userId) return null;
  return decoded as { userId: string; userType?: string };
}

function isAdminToken(decoded: { userType?: string }) {
  const t = String(decoded.userType || '').toUpperCase();
  return t === 'ADMIN' || t === 'SUPER_ADMIN' || t === 'SUPERADMIN' || t === 'OPERATOR';
}

function extFromMime(mime: string): string | null {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/gif') return 'gif';
  if (mime === 'image/webp') return 'webp';
  return null;
}

function parseDataUrl(dataUrl: string): { mime: string; buffer: Buffer } | null {
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl.trim());
  if (!match) return null;
  const mime = match[1].toLowerCase();
  const ext = extFromMime(mime);
  if (!ext) return null;
  try {
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > MAX_BYTES) return null;
    return { mime, buffer };
  } catch {
    return null;
  }
}

/** GET - Channel display settings (photo) for any authenticated user. */
export async function GET(request: NextRequest) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const settings = await readChannelSettings();
    return NextResponse.json({
      channelName: settings.channelName,
      channelPhoto: settings.photoUrl,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Chat channel-settings GET:', error);
    return NextResponse.json({ error: 'Failed to load channel settings' }, { status: 500 });
  }
}

/** POST - Admin sets the Movesbook channel photo (multipart file or JSON dataUrl). */
export async function POST(request: NextRequest) {
  try {
    const decoded = authorize(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    if (!isAdminToken(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let ext = 'jpg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file');
      if (!(file instanceof Blob)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
      }
      const mimeExt = extFromMime(file.type);
      if (!mimeExt) {
        return NextResponse.json({ error: 'Invalid file type. Only images are allowed' }, { status: 400 });
      }
      ext = mimeExt;
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      let body: Record<string, unknown> = {};
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
      const dataUrl = typeof body.photoDataUrl === 'string' ? body.photoDataUrl : '';
      const parsed = parseDataUrl(dataUrl);
      if (!parsed) {
        return NextResponse.json(
          { error: 'Invalid photo. Provide multipart file or photoDataUrl.' },
          { status: 400 }
        );
      }
      const mimeExt = extFromMime(parsed.mime);
      if (!mimeExt || !ALLOWED_EXT.has(mimeExt === 'jpeg' ? 'jpg' : mimeExt)) {
        return NextResponse.json({ error: 'Invalid file type. Only images are allowed' }, { status: 400 });
      }
      ext = mimeExt === 'jpeg' ? 'jpg' : mimeExt;
      buffer = parsed.buffer;
    }

    if (!buffer?.length) {
      return NextResponse.json({ error: 'Empty image' }, { status: 400 });
    }

    const dir = await ensureChatUploadDir();
    const fileName = `channel-photo-${Date.now()}.${ext}`;
    await writeFile(join(dir, fileName), buffer);
    await clearOldChannelPhotos(fileName);

    const photoUrl = `/uploads/chat/${fileName}`;
    const settings = await writeChannelSettings({ photoUrl });

    return NextResponse.json({
      success: true,
      channelName: settings.channelName,
      channelPhoto: settings.photoUrl,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Chat channel-settings POST:', error);
    return NextResponse.json({ error: 'Failed to save channel photo' }, { status: 500 });
  }
}
