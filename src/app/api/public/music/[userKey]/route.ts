import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/music/[userKey]
 * Public (no auth) — owner's My Music OGP articles for share links.
 * userKey may be username or user id.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userKey: string }> }
) {
  try {
    const { userKey: raw } = await params;
    const userKey = decodeURIComponent(raw || '').trim();
    if (!userKey) {
      return NextResponse.json({ error: 'User key required' }, { status: 400 });
    }

    const owner = await prisma.user.findFirst({
      where: {
        OR: [{ username: userKey }, { id: userKey }],
      },
      select: {
        id: true,
        username: true,
        name: true,
        country: true,
      },
    });

    if (!owner) {
      return NextResponse.json({ error: 'Music not found' }, { status: 404 });
    }

    const now = new Date();
    const list = await prisma.musicOgpArticle.findMany({
      where: {
        userId: owner.id,
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { savedAt: 'desc' },
      select: {
        id: true,
        title: true,
        artist: true,
        image: true,
        description: true,
        url: true,
        siteName: true,
        customDescription: true,
        topic: true,
        genre: true,
        registrationType: true,
        isFavourite: true,
        savedAt: true,
      },
    });

    let viewRows: { id: string; viewCount: number }[] = [];
    if (list.length > 0) {
      try {
        viewRows = await prisma.$queryRaw<{ id: string; viewCount: number }[]>`
          SELECT id, viewCount FROM music_ogp_articles
          WHERE id IN (${Prisma.join(list.map((a) => a.id))})
        `;
      } catch {
        viewRows = [];
      }
    }
    const viewById = new Map(viewRows.map((r) => [r.id, r.viewCount ?? 0]));

    const articles = list.map((a) => ({
      id: a.id,
      title: a.title,
      artist: a.artist,
      image: a.image,
      description: a.description,
      url: a.url,
      siteName: a.siteName,
      customDescription: a.customDescription,
      topic: a.topic,
      genre: a.genre,
      registrationType: a.registrationType,
      isFavourite: a.isFavourite === true,
      viewCount: viewById.get(a.id) ?? 0,
      savedAt: a.savedAt.toISOString(),
      creatorUsername: owner.username,
      userId: owner.id,
      createdByCurrentUser: false,
    }));

    const ownerName = (owner.name && owner.name.trim()) || owner.username || null;

    return NextResponse.json({
      owner: {
        id: owner.id,
        username: owner.username,
        name: ownerName,
        country: owner.country,
      },
      articles,
      articleCount: articles.length,
    });
  } catch (e) {
    console.error('GET /api/public/music/[userKey]', e);
    return NextResponse.json({ error: 'Failed to load music' }, { status: 500 });
  }
}
