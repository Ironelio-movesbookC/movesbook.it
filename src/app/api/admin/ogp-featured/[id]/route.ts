import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTableSuperAdmin } from '@/lib/globalNewsAuth';

/** PATCH — toggle featured News Card flags on an OGP article (super admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTableSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    const data: { isFeatured?: boolean; displayInEvidence?: boolean } = {};

    if (typeof body.isFeatured === 'boolean') {
      data.isFeatured = body.isFeatured;
    }
    if (typeof body.displayInEvidence === 'boolean') {
      data.displayInEvidence = body.displayInEvidence;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json(
        { error: 'isFeatured and/or displayInEvidence (boolean) required' },
        { status: 400 },
      );
    }

    const existing = await prisma.ogpArticle.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'OGP article not found' }, { status: 404 });
    }

    const updated = await prisma.ogpArticle.update({
      where: { id },
      data,
      select: { id: true, isFeatured: true, displayInEvidence: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH /api/admin/ogp-featured/[id]', e);
    return NextResponse.json({ error: 'Failed to update featured flags' }, { status: 500 });
  }
}
