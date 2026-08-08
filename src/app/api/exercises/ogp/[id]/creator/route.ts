import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser } from '../../../auth';

const NEWS_SYSTEM_USERNAME = 'movesbook-news-system';

/** Any authenticated user can view the creator (poster) of an exercise OGP article. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;

  try {
    const article = await prisma.exerciseOgpArticle.findUnique({
      where: { id },
      select: { userId: true },
    });
    if (!article) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const newsSystemUser = await prisma.user.findFirst({
      where: { username: NEWS_SYSTEM_USERNAME },
      select: { id: true },
    });
    const isNewsSystemCreator = newsSystemUser && article.userId === newsSystemUser.id;

    if (isNewsSystemCreator && auth.isSuperAdmin) {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: auth.userId },
        select: { name: true, username: true, email: true },
      });
      if (!superAdmin) {
        return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
      }
      return NextResponse.json({
        name: superAdmin.name ?? null,
        email: superAdmin.email ?? null,
        username: superAdmin.username ?? null,
        gender: null,
        country: null,
        telegramAccount: null,
        image: null,
      });
    }

    const creator = await prisma.user.findUnique({
      where: { id: article.userId },
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
    console.error('GET /api/exercises/ogp/[id]/creator', e);
    return NextResponse.json({ error: 'Failed to load creator' }, { status: 500 });
  }
}
