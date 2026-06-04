import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { requireAdmin } from '@/lib/adminAuth';
import { getServerPublicDir } from '@/lib/serverPublicDir';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

/** POST — Upload VIP reference-list banner image for a registered user (admin). */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const userId = params?.id?.trim();
  if (!userId) {
    return NextResponse.json({ error: 'User id is required' }, { status: 400 });
  }

  try {
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
    let ext =
      extFromName && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extFromName)
        ? extFromName === 'jpeg'
          ? 'jpg'
          : extFromName
        : 'jpg';

    if (file.type === 'image/png') ext = 'png';
    else if (file.type === 'image/gif') ext = 'gif';
    else if (file.type === 'image/webp') ext = 'webp';

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const fileName = `vip_ref_${userId.slice(0, 8)}_${timestamp}_${randomString}.${ext}`;

    const uploadDir = join(getServerPublicDir(), 'uploads', 'vip-reference-banners');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const publicPath = `/uploads/vip-reference-banners/${fileName}`;

    return NextResponse.json({
      success: true,
      path: publicPath,
      fileName: file.name,
    });
  } catch (error: unknown) {
    console.error('vip-banner-upload:', error);
    const message = error instanceof Error ? error.message : 'Upload failed';
    return NextResponse.json({ error: 'Failed to upload banner', details: message }, { status: 500 });
  }
}
