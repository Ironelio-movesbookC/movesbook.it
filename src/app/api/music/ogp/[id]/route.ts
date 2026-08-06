import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser } from '../../auth';

function parseJsonArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  if (typeof value === 'string') {
    try {
      const a = JSON.parse(value);
      return Array.isArray(a) ? a.filter((x: unknown): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** Only super admin, admin, or the article creator can delete. Admin/super_admin: permanent delete. Creator: soft delete (row kept, visible to admin). */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isAdmin } = auth;
  const { id } = await params;

  try {
    const existing = await prisma.musicOgpArticle.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const isCreator = existing.userId === userId;
    const canDelete = isAdmin || isCreator;
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only super admin, admin, or the article creator can delete OGP articles' },
        { status: 403 }
      );
    }

    if (isAdmin) {
      await prisma.musicOgpArticle.delete({ where: { id } });
    } else {
      await prisma.musicOgpArticle.update({
        where: { id },
        data: { deletedAt: new Date(), deletedByUserId: userId },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/music/ogp/[id]', e);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}

/** Only super admin, admin, or the article creator can update OGP visibility settings. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isAdmin } = auth;
  const { id } = await params;

  try {
    const existing = await prisma.musicOgpArticle.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const isCreator = existing.userId === userId;
    const canUpdate = isAdmin || isCreator;
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Only super admin, admin, or the article creator can update OGP settings' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data: {
      topic?: string;
      customDescription?: string | null;
      title?: string | null;
      image?: string | null;
      description?: string | null;
      url?: string;
      siteName?: string | null;
      type?: string | null;
      languageCode?: string | null;
      visibilityUserTypes?: string;
      visibilityCountries?: string;
      visibilityLanguages?: string;
      visibilitySports?: string;
      expiresAt?: Date | null;
    } = {};

    if (body.topic !== undefined && typeof body.topic === 'string' && body.topic.trim()) {
      data.topic = body.topic.trim();
    }
    if (body.customDescription !== undefined) {
      data.customDescription = typeof body.customDescription === 'string'
        ? (body.customDescription.trim() || null)
        : null;
    }
    if (body.url !== undefined) {
      if (typeof body.url !== 'string' || !body.url.trim()) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }
      data.url = body.url.trim();
    }
    if (body.title !== undefined || body.musicTitle !== undefined) {
      const musicTitle =
        typeof body.musicTitle === 'string' && body.musicTitle.trim()
          ? body.musicTitle.trim()
          : null;
      data.title = musicTitle ?? (body.title != null ? String(body.title) : null);
    }
    if (body.image !== undefined) {
      data.image = typeof body.image === 'string' ? body.image : null;
    }
    if (body.description !== undefined) {
      data.description = typeof body.description === 'string' ? body.description : null;
    }
    if (body.siteName !== undefined) {
      data.siteName = typeof body.siteName === 'string' ? body.siteName : null;
    }
    if (body.type !== undefined) {
      data.type = typeof body.type === 'string' ? body.type : null;
    }
    if (body.languageCode !== undefined) {
      data.languageCode =
        typeof body.languageCode === 'string' && body.languageCode.trim()
          ? body.languageCode.trim()
          : null;
    }
    if (body.visibilityUserTypes !== undefined) {
      data.visibilityUserTypes = JSON.stringify(parseJsonArray(body.visibilityUserTypes));
    }
    if (body.visibilityCountries !== undefined) {
      data.visibilityCountries = JSON.stringify(parseJsonArray(body.visibilityCountries));
    }
    if (body.visibilityLanguages !== undefined) {
      data.visibilityLanguages = JSON.stringify(parseJsonArray(body.visibilityLanguages));
    }
    if (body.visibilitySports !== undefined) {
      data.visibilitySports = JSON.stringify(parseJsonArray(body.visibilitySports));
    }
    if (body.expiresAt !== undefined) {
      data.expiresAt = body.expiresAt != null && body.expiresAt !== ''
        ? new Date(body.expiresAt)
        : null;
    }

    const genreName =
      body.genre !== undefined
        ? typeof body.genre === 'string' && body.genre.trim()
          ? body.genre.trim()
          : null
        : undefined;
    const artistName =
      body.artist !== undefined
        ? typeof body.artist === 'string' && body.artist.trim()
          ? body.artist.trim()
          : null
        : undefined;
    const registrationTypeName =
      body.registrationType !== undefined
        ? typeof body.registrationType === 'string' && body.registrationType.trim()
          ? body.registrationType.trim()
          : null
        : undefined;
    const isFavouriteValue =
      body.isFavourite !== undefined ? body.isFavourite === true : undefined;

    const hasExtras =
      genreName !== undefined ||
      artistName !== undefined ||
      registrationTypeName !== undefined ||
      isFavouriteValue !== undefined;

    if (Object.keys(data).length === 0 && !hasExtras) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    if (Object.keys(data).length > 0) {
      await prisma.musicOgpArticle.update({
        where: { id },
        data,
      });
    }

    if (hasExtras) {
      const currentRows = await prisma.$queryRaw<
        {
          genre: string | null;
          artist: string | null;
          registrationType: string | null;
          isFavourite: number | boolean;
        }[]
      >`
        SELECT genre, artist, registrationType, isFavourite
        FROM music_ogp_articles
        WHERE id = ${id}
        LIMIT 1
      `;
      const current = currentRows[0];
      const nextGenre = genreName !== undefined ? genreName : (current?.genre ?? null);
      const nextArtist = artistName !== undefined ? artistName : (current?.artist ?? null);
      const nextRegistrationType =
        registrationTypeName !== undefined
          ? registrationTypeName
          : (current?.registrationType ?? null);
      const nextIsFavourite =
        isFavouriteValue !== undefined
          ? isFavouriteValue
          : current?.isFavourite === true || current?.isFavourite === 1;
      await prisma.$executeRaw`
        UPDATE music_ogp_articles
        SET genre = ${nextGenre},
            artist = ${nextArtist},
            registrationType = ${nextRegistrationType},
            isFavourite = ${nextIsFavourite}
        WHERE id = ${id}
      `;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PATCH /api/music/ogp/[id]', e);
    return NextResponse.json({ error: 'Failed to update article settings' }, { status: 500 });
  }
}
