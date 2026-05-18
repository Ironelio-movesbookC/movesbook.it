import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStaffSelfOrAdminPanel } from '@/lib/panelAuth';

export const dynamic = 'force-dynamic';

const PROFILE_KINDS = ['OPERATOR', 'CO_ADMIN'] as const;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

async function assertStaffExists(staffAccountId: string) {
  const row = await prisma.staffAccount.findFirst({
    where: { id: staffAccountId, kind: { in: [...PROFILE_KINDS] } },
    select: { id: true },
  });
  return Boolean(row);
}

function mapRow(r: {
  id: string;
  username: string;
  name: string;
  country: string | null;
  language: string | null;
  lastLogin: Date | null;
  imageUrl: string | null;
}) {
  return {
    id: r.id,
    username: r.username,
    name: r.name,
    country: r.country ?? '',
    language: r.language ?? '',
    lastLogin: r.lastLogin ? r.lastLogin.toISOString() : null,
    lastLoginDisplay: r.lastLogin
      ? r.lastLogin.toLocaleString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—',
    imageUrl: r.imageUrl,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: staffAccountId } = params;
  const auth = await requireStaffSelfOrAdminPanel(_request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!staffAccountId) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  if (!(await assertStaffExists(staffAccountId))) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const rows = await prisma.staffAssignedUser.findMany({
    where: { staffAccountId },
    orderBy: { id: 'desc' },
    select: {
      id: true,
      username: true,
      name: true,
      country: true,
      language: true,
      lastLogin: true,
      imageUrl: true,
    },
  });

  return NextResponse.json({ users: rows.map(mapRow) });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id: staffAccountId } = params;
  const auth = await requireStaffSelfOrAdminPanel(request, staffAccountId);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  if (!staffAccountId) {
    return NextResponse.json({ error: 'Operator id is required' }, { status: 400 });
  }

  if (!(await assertStaffExists(staffAccountId))) {
    return NextResponse.json({ error: 'Staff profile not found' }, { status: 404 });
  }

  const contentType = request.headers.get('content-type') || '';
  let username = '';
  let name = '';
  let country: string | null = null;
  let language: string | null = null;
  let lastLogin: Date | null = null;
  let imageUrl: string | null = null;

  if (contentType.includes('multipart/form-data')) {
    const form = await request.formData();
    username = String(form.get('username') ?? '').trim();
    name = String(form.get('name') ?? '').trim();
    const c = String(form.get('country') ?? '').trim();
    const l = String(form.get('language') ?? '').trim();
    country = c || null;
    language = l || null;
    const lastRaw = String(form.get('lastLogin') ?? '').trim();
    if (lastRaw) {
      const d = new Date(lastRaw);
      if (!Number.isNaN(d.getTime())) lastLogin = d;
    }
    const file = form.get('file');
    if (file instanceof File && file.size > 0) {
      if (!file.type?.startsWith('image/')) {
        return NextResponse.json({ error: 'Only image files are allowed' }, { status: 400 });
      }
      const buf = await file.arrayBuffer();
      if (buf.byteLength > MAX_IMAGE_BYTES) {
        return NextResponse.json({ error: 'Image is too large (max 2MB)' }, { status: 413 });
      }
      const b64 = Buffer.from(buf).toString('base64');
      imageUrl = `data:${file.type};base64,${b64}`;
    }
  } else {
    const body = await request.json().catch(() => ({}));
    username = String(body.username ?? '').trim();
    name = String(body.name ?? '').trim();
    const c = String(body.country ?? '').trim();
    const l = String(body.language ?? '').trim();
    country = c || null;
    language = l || null;
    const lastRaw = String(body.lastLogin ?? '').trim();
    if (lastRaw) {
      const d = new Date(lastRaw);
      if (!Number.isNaN(d.getTime())) lastLogin = d;
    }
    const img = body.imageUrl != null ? String(body.imageUrl) : '';
    if (img) {
      if (img.length > MAX_IMAGE_BYTES * 2) {
        return NextResponse.json({ error: 'Image data is too large' }, { status: 413 });
      }
      imageUrl = img;
    }
  }

  if (!username || !name) {
    return NextResponse.json({ error: 'username and name are required' }, { status: 400 });
  }

  const created = await prisma.staffAssignedUser.create({
    data: {
      staffAccountId,
      username,
      name,
      country,
      language,
      lastLogin,
      imageUrl,
    },
    select: {
      id: true,
      username: true,
      name: true,
      country: true,
      language: true,
      lastLogin: true,
      imageUrl: true,
    },
  });

  return NextResponse.json({ success: true, user: mapRow(created) }, { status: 201 });
}
