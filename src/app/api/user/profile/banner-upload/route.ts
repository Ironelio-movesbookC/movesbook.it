import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type. Only images are allowed' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extFromName = file.name.split('.').pop()?.toLowerCase();
    let ext = extFromName && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extFromName)
      ? extFromName === 'jpeg'
        ? 'jpg'
        : extFromName
      : 'jpg';

    if (file.type === 'image/png') ext = 'png';
    else if (file.type === 'image/gif') ext = 'gif';
    else if (file.type === 'image/webp') ext = 'webp';

    // Do not delete previous banner files here — sequence uploads add multiple files per session.
    // Orphan cleanup runs in PATCH /api/user/profile after save (see userMediaUploadCleanup).

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `banner_${decoded.userId.slice(0, 8)}_${timestamp}_${randomString}.${ext}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'profile_banners');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/profile_banners/${fileName}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      fileName,
    });
  } catch (error: unknown) {
    console.error('Error uploading profile banner:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to upload banner', details: message }, { status: 500 });
  }
}
