import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/music/[userKey]/folders
 * Public (no auth) — Music Folders for Get Link pages (same set as that owner's My Music).
 *
 * - Admin / superadmin-linked owners: all non-deleted, non-expired folders (matches admin panel).
 * - Everyone else: only that owner's folders.
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
        userType: true,
        superAdminId: true,
      },
    });

    if (!owner) {
      return NextResponse.json({ error: 'Music not found' }, { status: 404 });
    }

    const now = new Date();
    const isPrivileged =
      owner.userType === 'ADMIN' || Boolean(owner.superAdminId);

    const groups = await prisma.musicOgpGroup.findMany({
      where: {
        ...(isPrivileged ? {} : { userId: owner.id }),
        deletedAt: null,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      orderBy: { savedAt: 'desc' },
      include: {
        user: { select: { username: true } },
        items: {
          orderBy: [{ sortOrder: 'asc' }, { addedAt: 'asc' }],
          include: {
            musicOgpArticle: {
              select: {
                id: true,
                image: true,
                deletedAt: true,
                expiresAt: true,
              },
            },
          },
        },
      },
    });

    const folders = groups.map((g) => {
      const activeItems = g.items.filter((item) => {
        const a = item.musicOgpArticle;
        if (!a || a.deletedAt) return false;
        if (a.expiresAt && a.expiresAt < now) return false;
        return true;
      });
      const firstImage =
        g.coverImage ??
        activeItems.find((i) => i.musicOgpArticle?.image)?.musicOgpArticle?.image ??
        null;
      const memberIds = activeItems.map((i) => i.musicOgpArticleId);

      return {
        id: g.id,
        name: g.name,
        coverImage: g.coverImage,
        image: firstImage,
        memberCount: memberIds.length,
        memberIds,
        savedAt: g.savedAt.toISOString(),
        deletedAt: null,
        expiresAt: g.expiresAt?.toISOString() ?? null,
        creatorUsername: g.user?.username ?? owner.username,
      };
    });

    return NextResponse.json(folders);
  } catch (e) {
    console.error('GET /api/public/music/[userKey]/folders', e);
    return NextResponse.json({ error: 'Failed to load music folders' }, { status: 500 });
  }
}
