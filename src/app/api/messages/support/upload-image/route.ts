import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { requireMessageAuth } from '@/lib/messages/messageAuth';
import { getServerPublicDir, verifyPublicFile } from '@/lib/serverPublicDir';
import { toMediaApiPath } from '@/lib/uploadMediaUrl';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXT = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp']);

export async function POST(request: NextRequest) {
  const auth = await requireMessageAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'Image size exceeds 5MB limit' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let fileExtension = (file.name.split('.').pop() || 'jpg').toLowerCase();
    if (!ALLOWED_EXT.has(fileExtension)) {
      const typeExt = file.type.split('/')[1]?.toLowerCase();
      fileExtension = typeExt === 'jpeg' ? 'jpg' : typeExt && ALLOWED_EXT.has(typeExt) ? typeExt : 'jpg';
    }
    if (fileExtension === 'jpeg') fileExtension = 'jpg';

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 12);
    const fileName = `support_${auth.userId.slice(0, 8)}_${timestamp}_${randomString}.${fileExtension}`;

    const uploadDir = join(getServerPublicDir(), 'uploads', 'support');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    if (!(await verifyPublicFile(filePath))) {
      return NextResponse.json(
        { error: 'Upload saved but file verification failed' },
        { status: 500 },
      );
    }

    const publicPath = `/uploads/support/${fileName}`;
    const browserPath = toMediaApiPath(publicPath) ?? publicPath;

    return NextResponse.json({
      success: true,
      path: browserPath,
      fileName,
    });
  } catch (error) {
    console.error('POST /api/messages/support/upload-image', error);
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 });
  }
}
