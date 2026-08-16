import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/music/ogp/[id]/creator
 * Public (no auth) — creator profile for My Music share / Get Link pages.
 * Omits email (sensitive); returns display fields only.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Article id required' }, { status: 400 });
    }

    const article = await prisma.musicOgpArticle.findUnique({
      where: { id },
      select: {
        deletedAt: true,
        expiresAt: true,
        userId: true,
        user: {
          select: {
            name: true,
            username: true,
            gender: true,
            country: true,
            telegramAccount: true,
            image: true,
            superAdminId: true,
          },
        },
      },
    });

    if (!article || article.deletedAt) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }
    if (article.expiresAt && article.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const creator = article.user;
    if (!creator) {
      return NextResponse.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Prefer linked Super Admin display name when the poster is a superadmin user row.
    if (creator.superAdminId) {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: creator.superAdminId },
        select: { name: true, username: true },
      });
      if (superAdmin) {
        return NextResponse.json({
          name: superAdmin.name ?? creator.name ?? null,
          email: null,
          username: superAdmin.username ?? creator.username ?? null,
          gender: creator.gender ?? null,
          country: creator.country ?? null,
          telegramAccount: creator.telegramAccount ?? null,
          image: creator.image ?? null,
        });
      }
    }

    return NextResponse.json({
      name: creator.name ?? null,
      email: null,
      username: creator.username ?? null,
      gender: creator.gender ?? null,
      country: creator.country ?? null,
      telegramAccount: creator.telegramAccount ?? null,
      image: creator.image ?? null,
    });
  } catch (e) {
    console.error('GET /api/public/music/ogp/[id]/creator', e);
    return NextResponse.json({ error: 'Failed to load creator' }, { status: 500 });
  }
}
