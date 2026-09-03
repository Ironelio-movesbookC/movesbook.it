import { NextRequest, NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getServerPublicDir, verifyPublicFile } from '@/lib/serverPublicDir';
import { toMediaApiPath } from '@/lib/uploadMediaUrl';

export const dynamic = 'force-dynamic';

type UploadBlob = {
  name?: string;
  type?: string;
  size: number;
  arrayBuffer: () => Promise<ArrayBuffer>;
};

function asUploadBlob(value: FormDataEntryValue | null): UploadBlob | null {
  if (!value || typeof value === 'string') return null;
  if (typeof (value as Blob).arrayBuffer !== 'function') return null;
  if (typeof (value as Blob).size !== 'number') return null;
  return value as UploadBlob;
}

function extensionOf(name: string | undefined, fallback: string): string {
  const ext = name?.split('.').pop()?.toLowerCase()?.replace(/[^a-z0-9]/g, '');
  return ext || fallback;
}

function isAllowedImage(mime: string, ext: string): boolean {
  const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (mime && allowedMime.includes(mime)) return true;
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
}

function isAllowedPdf(mime: string, ext: string): boolean {
  if (mime === 'application/pdf' || mime === 'application/x-pdf') return true;
  return ext === 'pdf';
}

function getUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token)?.userId ?? null;
}

async function assertProfileAccess(clubId: string, memberId: string, viewerUserId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { adminId: true },
  });
  if (!club) return { error: 'Club not found', status: 404 as const };
  const membership = await prisma.clubMember.findUnique({
    where: { clubId_memberId: { clubId, memberId } },
    select: { id: true },
  });
  if (!membership) return { error: 'Member not found in this club', status: 404 as const };
  const isClubAdmin = club.adminId === viewerUserId;
  const isSelf = memberId === viewerUserId;
  if (!isClubAdmin && !isSelf) return { error: 'Access denied', status: 403 as const };
  return { membership, isClubAdmin, isSelf };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { clubId: string; memberId: string } },
) {
  const viewerUserId = getUserId(request);
  if (!viewerUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const access = await assertProfileAccess(params.clubId, params.memberId, viewerUserId);
  if ('error' in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const formData = await request.formData().catch(() => null);
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = asUploadBlob(formData.get('file'));
  const kind = String(formData.get('kind') || '').trim();
  if (!file || file.size <= 0) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }
  if (kind !== 'image' && kind !== 'pdf' && kind !== 'photo' && kind !== 'ecg') {
    return NextResponse.json({ error: 'kind must be image, pdf, photo, or ecg' }, { status: 400 });
  }

  const maxSize = kind === 'pdf' ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: `File size exceeds ${kind === 'pdf' ? '15MB' : '5MB'} limit` },
      { status: 400 },
    );
  }

  const mime = String(file.type || '').toLowerCase();
  const ext =
    kind === 'pdf' ? 'pdf' : extensionOf(file.name, mime.includes('png') ? 'png' : 'jpg');

  if (kind === 'pdf') {
    if (!isAllowedPdf(mime, ext)) {
      return NextResponse.json({ error: 'Invalid file type. Only PDF allowed' }, { status: 400 });
    }
  } else if (!isAllowedImage(mime, ext)) {
    return NextResponse.json({ error: 'Invalid image type' }, { status: 400 });
  }

  const folder = kind === 'photo' ? 'member-photos' : 'member-medical';
  const fileName = `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const uploadDir = join(getServerPublicDir(), 'uploads', folder, params.memberId);
  if (!existsSync(uploadDir)) {
    await mkdir(uploadDir, { recursive: true });
  }
  const filePath = join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(await file.arrayBuffer()));

  if (!(await verifyPublicFile(filePath))) {
    return NextResponse.json({ error: 'Upload verification failed' }, { status: 500 });
  }

  const publicPath = `/uploads/${folder}/${params.memberId}/${fileName}`;
  const browserPath = toMediaApiPath(publicPath) ?? publicPath;

  return NextResponse.json({
    success: true,
    kind,
    path: browserPath,
  });
}
