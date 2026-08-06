import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const list = await prisma.musicTypedArticle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const ids = list.map((a) => a.id);
    const metaById = new Map<
      string,
      { artist: string | null; title: string | null; registrationType: string | null; isFavourite: boolean }
    >();
    if (ids.length > 0) {
      const rows = await prisma.$queryRaw<
        { id: string; artist: string | null; title: string | null; registrationType: string | null; isFavourite: number | boolean }[]
      >`
        SELECT id, artist, title, registrationType, isFavourite FROM music_typed_articles WHERE id IN (${Prisma.join(ids)})
      `;
      for (const row of rows) {
        metaById.set(row.id, {
          artist: row.artist,
          title: row.title,
          registrationType: row.registrationType,
          isFavourite: row.isFavourite === true || row.isFavourite === 1,
        });
      }
    }
    const articles = list.map((a) => {
      const meta = metaById.get(a.id);
      return {
        id: a.id,
        description: a.description,
        artist: meta?.artist ?? (a as { artist?: string | null }).artist ?? null,
        title: meta?.title ?? (a as { title?: string | null }).title ?? null,
        registrationType:
          meta?.registrationType ??
          (a as { registrationType?: string | null }).registrationType ??
          null,
        isFavourite: meta?.isFavourite ?? false,
        createdAt: a.createdAt.toISOString(),
      };
    });
    return NextResponse.json(articles);
  } catch (e) {
    console.error('GET /api/music/typed', e);
    return NextResponse.json({ error: 'Failed to load typed articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    const artistName =
      typeof body.artist === 'string' && body.artist.trim() ? body.artist.trim() : null;
    const titleName =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim()
        : typeof body.musicTitle === 'string' && body.musicTitle.trim()
          ? body.musicTitle.trim()
          : null;
    const registrationTypeName =
      typeof body.registrationType === 'string' && body.registrationType.trim()
        ? body.registrationType.trim()
        : null;
    const isFavouriteValue = body.isFavourite === true;
    const created = await prisma.musicTypedArticle.create({
      data: { userId, description },
    });
    if (artistName || titleName || registrationTypeName || isFavouriteValue) {
      await prisma.$executeRaw`
        UPDATE music_typed_articles
        SET artist = COALESCE(${artistName}, artist),
            title = COALESCE(${titleName}, title),
            registrationType = COALESCE(${registrationTypeName}, registrationType),
            isFavourite = ${isFavouriteValue}
        WHERE id = ${created.id}
      `;
    }
    return NextResponse.json({
      id: created.id,
      description: created.description,
      artist: artistName,
      title: titleName,
      registrationType: registrationTypeName,
      isFavourite: isFavouriteValue,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e) {
    console.error('POST /api/music/typed', e);
    return NextResponse.json({ error: 'Failed to create typed article' }, { status: 500 });
  }
}
