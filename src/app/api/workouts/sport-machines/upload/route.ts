import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const type = formData.get('type') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!['picture-a', 'picture-b', 'catalog'].includes(type || '')) {
      return NextResponse.json(
        { error: 'Invalid type: picture-a, picture-b, or catalog' },
        { status: 400 }
      );
    }

    const maxSize = 8 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'File exceeds 8MB' }, { status: 400 });
    }

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split('.').pop() || 'jpg';
    const fileName = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
    const dir = join(process.cwd(), 'public', 'uploads', 'sport-machines');
    if (!existsSync(dir)) await mkdir(dir, { recursive: true });
    await writeFile(join(dir, fileName), buffer);

    return NextResponse.json({
      success: true,
      path: `/uploads/sport-machines/${fileName}`,
    });
  } catch (e) {
    console.error('sport-machines upload', e);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
