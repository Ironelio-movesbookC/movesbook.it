import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { verifyToken } from '@/lib/auth';
import {
  clearOldChannelPhotos,
  readChannelSettings,
  writeChannelSettings,
} from '@/lib/chat/channelSettings';
import { resolveClubChannelAuth } from '@/lib/chat/clubChannelAuth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_CHANNEL_NAME_LEN = 64;
/** Channel avatar is small in UI — keep data URL under MySQL/JSON-friendly size. */
const PHOTO_MAX_EDGE = 512;
const PHOTO_JPEG_QUALITY = 82;

function authorize(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  const decoded = verifyToken(authHeader.replace('Bearer ', ''));
  if (!decoded?.userId) return null;
  return decoded as { userId: string; userType?: string };
}

function parseClubId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
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
  if (!extFromMime(mime)) return null;
  try {
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > MAX_BYTES) return null;
    return { mime, buffer };
  } catch {
    return null;
  }
}

async function toChannelPhotoDataUrl(input: Buffer): Promise<string> {
  const jpeg = await sharp(input)
    .rotate()
    .resize(PHOTO_MAX_EDGE, PHOTO_MAX_EDGE, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .jpeg({ quality: PHOTO_JPEG_QUALITY, mozjpeg: true })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

async function assertCanWriteSettings(
  request: NextRequest,
  decoded: { userType?: string },
  clubId: string | null
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (clubId) {
    const clubAuth = await resolveClubChannelAuth(request, clubId);
    if (!clubAuth.ok) {
      return { ok: false, status: clubAuth.status, error: clubAuth.error };
    }
    return { ok: true };
  }
  if (!isAdminToken(decoded)) {
    return { ok: false, status: 403, error: 'Admin access required' };
  }
  return { ok: true };
}

function normalizeChannelName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_CHANNEL_NAME_LEN);
}

/** GET - Channel display settings (photo + name) for any authenticated user. */
export async function GET(request: NextRequest) {
  try {
    if (!authorize(request)) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const clubId = parseClubId(request.nextUrl.searchParams.get('clubId'));
    const settings = await readChannelSettings(clubId);
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

/**
 * POST - Admin / club admin updates channel settings.
 * Accepts:
 *  - JSON `{ channelName, clubId? }` — rename only
 *  - JSON `{ photoDataUrl, channelName?, clubId? }` — photo (+ optional rename)
 *  - multipart `file` (+ optional `clubId`, `channelName`) — photo upload
 *
 * Photos are stored as compressed data URLs in channel-settings.json
 * (same approach as operator/avatar photos — no separate image file under public/).
 */
export async function POST(request: NextRequest) {
  try {
    const decoded = authorize(request);
    if (!decoded) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const contentType = request.headers.get('content-type') || '';
    let buffer: Buffer | null = null;
    let clubId: string | null = null;
    let channelNamePatch: string | null = null;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      clubId = parseClubId(formData.get('clubId'));
      channelNamePatch = normalizeChannelName(formData.get('channelName'));
      const file = formData.get('file');
      if (!(file instanceof File) && !(file instanceof Blob)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 413 });
      }
      const mime = 'type' in file && typeof file.type === 'string' ? file.type : '';
      if (!mime.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
      }
      buffer = Buffer.from(await file.arrayBuffer());
    } else {
      let body: Record<string, unknown> = {};
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        body = {};
      }
      clubId = parseClubId(body.clubId);
      channelNamePatch = normalizeChannelName(body.channelName);

      const dataUrl = typeof body.photoDataUrl === 'string' ? body.photoDataUrl : '';
      if (dataUrl) {
        const parsed = parseDataUrl(dataUrl);
        if (!parsed) {
          return NextResponse.json(
            { error: 'Invalid photo. Provide multipart file or photoDataUrl.' },
            { status: 400 }
          );
        }
        buffer = parsed.buffer;
      } else if (!channelNamePatch) {
        return NextResponse.json(
          { error: 'Provide channelName and/or a channel photo.' },
          { status: 400 }
        );
      }
    }

    const auth = await assertCanWriteSettings(request, decoded, clubId);
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Rename-only (no photo)
    if (!buffer?.length) {
      const settings = await writeChannelSettings(
        channelNamePatch ? { channelName: channelNamePatch } : {},
        clubId
      );
      return NextResponse.json({
        success: true,
        channelName: settings.channelName,
        channelPhoto: settings.photoUrl,
        updatedAt: settings.updatedAt,
      });
    }

    let photoDataUrl: string;
    try {
      photoDataUrl = await toChannelPhotoDataUrl(buffer);
    } catch {
      return NextResponse.json({ error: 'Invalid or unsupported image file' }, { status: 400 });
    }

    // Drop legacy on-disk channel-photo-* files; photo now lives in settings JSON.
    await clearOldChannelPhotos(undefined, clubId);

    const settings = await writeChannelSettings(
      {
        photoUrl: photoDataUrl,
        ...(channelNamePatch ? { channelName: channelNamePatch } : {}),
      },
      clubId
    );

    return NextResponse.json({
      success: true,
      channelName: settings.channelName,
      channelPhoto: settings.photoUrl,
      updatedAt: settings.updatedAt,
    });
  } catch (error) {
    console.error('Chat channel-settings POST:', error);
    return NextResponse.json({ error: 'Failed to save channel settings' }, { status: 500 });
  }
}
