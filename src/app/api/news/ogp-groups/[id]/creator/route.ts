import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser } from '../../../auth';

/** GET /api/news/ogp-groups/[id]/creator — group creator profile. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const group = await prisma.ogpNewsGroup.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const creator = await prisma.user.findUnique({
      where: { id: group.userId },
      select: {
        name: true,
        email: true,
        username: true,
        gender: true,
        country: true,
        telegramAccount: true,
        image: true,
      },
    });
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    return NextResponse.json({
      name: creator.name,
      email: creator.email,
      username: creator.username,
      gender: creator.gender,
      country: creator.country,
      telegramAccount: creator.telegramAccount,
      image: creator.image ?? null,
    });
  } catch (e) {
    console.error('GET /api/news/ogp-groups/[id]/creator', e);
    return NextResponse.json({ error: 'Failed to load creator' }, { status: 500 });
  }
}
