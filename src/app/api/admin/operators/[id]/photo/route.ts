import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 2 * 1024 * 1024; // 2MB

function getIdFromRequest(request: NextRequest): string {
  const url = new URL(request.url);
  // /api/admin/operators/:id/photo
  const parts = url.pathname.split('/').filter(Boolean);
  const photoIdx = parts.lastIndexOf('photo');
  return photoIdx > 0 ? parts[photoIdx - 1] : '';
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  // Node runtime
  return Buffer.from(buffer).toString('base64');
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = getIdFromRequest(request);
  if (!id) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  const existing = await prisma.staffAccount.findFirst({
    where: { id, kind: 'OPERATOR' },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'file is required' }, { status: 400 });
  }

  if (!file.type?.startsWith('image/')) {
    return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  if (buffer.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'Image is too large (max 2MB)' }, { status: 413 });
  }

  const base64 = arrayBufferToBase64(buffer);
  const dataUrl = `data:${file.type};base64,${base64}`;

  const updated = await prisma.staffAccount.update({
    where: { id },
    data: { imageUrl: dataUrl },
    select: { id: true, imageUrl: true },
  });

  return NextResponse.json({ success: true, imageUrl: updated.imageUrl });
}

