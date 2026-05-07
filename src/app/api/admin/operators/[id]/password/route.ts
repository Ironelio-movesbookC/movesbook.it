import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import { hashPassword, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

function getIdFromRequest(request: NextRequest): string {
  const url = new URL(request.url);
  // /api/admin/operators/:id/password
  const parts = url.pathname.split('/').filter(Boolean);
  const idx = parts.lastIndexOf('password');
  return idx > 0 ? parts[idx - 1] : '';
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

  const body = await request.json().catch(() => ({}));
  const oldPassword = String(body.oldPassword ?? '');
  const newPassword = String(body.newPassword ?? '');

  if (!oldPassword || !newPassword) {
    return NextResponse.json(
      { error: 'oldPassword and newPassword are required' },
      { status: 400 },
    );
  }

  if (newPassword.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters' },
      { status: 400 },
    );
  }

  const operator = await prisma.staffAccount.findFirst({
    where: { id, kind: 'OPERATOR' },
    select: { id: true, password: true },
  });
  if (!operator) {
    return NextResponse.json({ error: 'Operator not found' }, { status: 404 });
  }

  const ok = await verifyPassword(oldPassword, operator.password);
  if (!ok) {
    return NextResponse.json({ error: 'Old password is incorrect' }, { status: 400 });
  }

  const hashed = await hashPassword(newPassword);
  await prisma.staffAccount.update({
    where: { id },
    data: { password: hashed },
    select: { id: true },
  });

  return NextResponse.json({ success: true });
}

