import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { getClubAuthContext } from '@/lib/procedures';
import { getServerPublicDir } from '@/lib/serverPublicDir';
import { deleteAllUserFilesInManagedDir, userMediaFilenamePrefix } from '@/lib/userMediaUploadCleanup';
import { getClubStaffById, setClubStaffImage } from '@/lib/club/clubStaffService';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const staff = await getClubStaffById(auth.ctx, params.id);
    if (!staff) {
      return NextResponse.json({ error: 'Staff member not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
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
    const extFromName = file instanceof File ? file.name.split('.').pop()?.toLowerCase() : undefined;
    let ext =
      extFromName && ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extFromName)
        ? extFromName === 'jpeg'
          ? 'jpg'
          : extFromName
        : 'jpg';
    if (file.type === 'image/png') ext = 'png';
    else if (file.type === 'image/gif') ext = 'gif';
    else if (file.type === 'image/webp') ext = 'webp';

    const idPrefix = userMediaFilenamePrefix(staff.userId);
    await deleteAllUserFilesInManagedDir('profile_avatars', `avatar_${idPrefix}_`);

    const fileName = `avatar_${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 15)}.${ext}`;
    const uploadDir = join(getServerPublicDir(), 'uploads', 'profile_avatars');
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    await writeFile(join(uploadDir, fileName), buffer);
    const publicPath = `/uploads/profile_avatars/${fileName}`;
    await setClubStaffImage(auth.ctx, params.id, publicPath);

    return NextResponse.json({ success: true, path: publicPath });
  } catch (error) {
    console.error('POST /api/club/staff/[id]/avatar:', error);
    const message = error instanceof Error ? error.message : 'Failed to upload photo';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
