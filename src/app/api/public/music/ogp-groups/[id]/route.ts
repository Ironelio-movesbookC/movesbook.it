import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/public/music/ogp-groups/[id]
 * Public (no auth) — group metadata + member OGP music for share links.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id?.trim()) {
      return NextResponse.json({ error: 'Group id required' }, { status: 400 });
    }

    const group = await prisma.musicOgpGroup.findUnique({
      where: { id },
      include: {
        user: { select: { username: true, name: true, country: true } },
        items: {
          include: {
            musicOgpArticle: {
              include: {
                user: { select: { username: true, name: true, country: true } },
              },
            },
          },
        },
      },
    });

    if (!group || group.deletedAt) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    if (group.expiresAt && group.expiresAt.getTime() < Date.now()) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const sortedItems = [...group.items].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.addedAt.getTime() - b.addedAt.getTime()
    );

    const members = sortedItems
      .map((item) => item.musicOgpArticle)
      .filter((a) => a != null && !a.deletedAt)
      .filter((a) => {
        if (a.expiresAt && a.expiresAt.getTime() < Date.now()) return false;
        return true;
      })
      .map((a) => ({
        id: a.id,
        title: a.title,
        image: a.image,
        description: a.description,
        url: a.url,
        siteName: a.siteName,
        type: a.type,
        customDescription: a.customDescription,
        topic: a.topic,
        languageCode: a.languageCode,
        savedAt: a.savedAt.toISOString(),
        creatorUsername: a.user?.username ?? null,
        creatorName: (a.user?.name && a.user.name.trim()) || a.user?.username || null,
      }));

    const creatorName =
      (group.user?.name && group.user.name.trim()) || group.user?.username || null;

    return NextResponse.json({
      group: {
        id: group.id,
        name: group.name,
        topic: group.topic,
        customDescription: group.customDescription,
        coverImage: group.coverImage,
        image: group.coverImage ?? members[0]?.image ?? null,
        savedAt: group.savedAt.toISOString(),
        memberCount: members.length,
        creatorUsername: group.user?.username ?? null,
        creatorName,
        creatorCountry: group.user?.country ?? null,
      },
      members,
    });
  } catch (e) {
    console.error('GET /api/public/music/ogp-groups/[id]', e);
    return NextResponse.json({ error: 'Failed to load group' }, { status: 500 });
  }
}
