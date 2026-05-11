import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

export const dynamic = 'force-dynamic';

function getIdFromRequest(request: NextRequest): string {
  const url = new URL(request.url);
  return url.pathname.split('/').filter(Boolean).pop() || '';
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const id = getIdFromRequest(request);
  if (!id) {
    return NextResponse.json({ error: 'Staff id is required' }, { status: 400 });
  }

  const staff = await prisma.staffAccount.findFirst({
    where: { id },
    select: {
      id: true,
      kind: true,
      username: true,
      name: true,
      surname: true,
      email: true,
      alternateEmail: true,
      phonePrefix: true,
      phoneNumber: true,
      cellularPrefix: true,
      cellularNumber: true,
      country: true,
      regions: true,
      roleLabel: true,
      facebook: true,
      twitter: true,
      website: true,
      blogsite: true,
      otherSite: true,
      otherInfos: true,
      imageUrl: true,
      lastLogin: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!staff) {
    return NextResponse.json({ error: 'Staff not found' }, { status: 404 });
  }

  return NextResponse.json({ staff });
}

