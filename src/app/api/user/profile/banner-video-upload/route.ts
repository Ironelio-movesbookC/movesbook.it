import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Banner background videos: larger than static images, still bounded for server safety. */
const MAX_BYTES = 80 * 1024 * 1024;
const ALLOWED = ['video/mp4', 'video/webm', 'video/quicktime'];

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
      return NextResponse.json({ error: 'File size exceeds 80MB limit' }, { status: 400 });
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Use MP4, WebM, or MOV.' },
        { status: 400 },
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const extFromName = file.name.split('.').pop()?.toLowerCase();
    let ext =
      extFromName && ['mp4', 'webm', 'mov'].includes(extFromName)
        ? extFromName === 'mov'
          ? 'mov'
          : extFromName
        : 'mp4';

    if (file.type === 'video/webm') ext = 'webm';
    else if (file.type === 'video/quicktime') ext = 'mov';

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `banner_video_${decoded.userId.slice(0, 8)}_${timestamp}_${randomString}.${ext}`;

    const uploadDir = join(process.cwd(), 'public', 'uploads', 'profile_banner_videos');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/profile_banner_videos/${fileName}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      fileName,
    });
  } catch (error: unknown) {
    console.error('Error uploading profile banner video:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to upload banner video', details: message }, { status: 500 });
  }
}
