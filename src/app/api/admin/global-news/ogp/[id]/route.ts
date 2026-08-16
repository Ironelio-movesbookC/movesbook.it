import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireTableSuperAdmin } from '@/lib/globalNewsAuth';

/** PATCH — toggle OGP News in Global News feed (super admin only). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireTableSuperAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  try {
    const body = await request.json().catch(() => ({}));
    if (typeof body.inGlobalNews !== 'boolean') {
      return NextResponse.json({ error: 'inGlobalNews (boolean) is required' }, { status: 400 });
    }

    const existing = await prisma.ogpArticle.findUnique({ where: { id }, select: { id: true } });
    if (!existing) {
      return NextResponse.json({ error: 'OGP article not found' }, { status: 404 });
    }

    const updated = await prisma.ogpArticle.update({
      where: { id },
      data: { inGlobalNews: body.inGlobalNews } as { inGlobalNews: boolean },
      select: { id: true, inGlobalNews: true } as { id: true; inGlobalNews: true },
    });

    return NextResponse.json(updated);
  } catch (e) {
    console.error('PATCH /api/admin/global-news/ogp/[id]', e);
    return NextResponse.json({ error: 'Failed to update global news flag' }, { status: 500 });
  }
}
