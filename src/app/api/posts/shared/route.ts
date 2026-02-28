import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;
    const { searchParams } = new URL(request.url);
    const mode  = searchParams.get('mode')  || 'mine';
    const page  = parseInt(searchParams.get('page')  || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip  = (page - 1) * limit;

    type ShareRow = {
      share_id: string;
      sharer_id: string;
      news_id: string;
      is_reshare_disabled: number;
      is_comments_enabled: number;
      shared_at: Date;
      news_title: string | null;
      news_image: string | null;
      news_author: string | null;
      news_original_author: string | null;
      news_category_id: string | null;
    };

    type CountRow = { total: bigint };

    let rows: ShareRow[]  = [];
    let total             = 0;

    if (mode === 'mine') {
      const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
        `SELECT COUNT(*) AS total FROM news_share_post nsp
         JOIN news n ON n.id = nsp.news_id
         WHERE nsp.user_id = ? AND nsp.share_option = 1`,
        userId
      );
      total = Number(countRows[0]?.total ?? 0);

      rows = await prisma.$queryRawUnsafe<ShareRow[]>(
        `SELECT nsp.id AS share_id, nsp.user_id AS sharer_id, nsp.news_id,
                nsp.is_reshare_disabled, nsp.is_comments_enabled, nsp.created AS shared_at,
                n.title AS news_title, n.image AS news_image,
                n.author AS news_author, n.originalAuthor AS news_original_author,
                n.newsCategoryId AS news_category_id
         FROM news_share_post nsp
         JOIN news n ON n.id = nsp.news_id
         WHERE nsp.user_id = ? AND nsp.share_option = 1
         ORDER BY nsp.created DESC
         LIMIT ? OFFSET ?`,
        userId, limit, skip
      );
    } else {
      const friends = await prisma.user.findMany({
        where: {
          OR: [
            { conversationsStarted: { some: { user2Id: userId } } },
            { conversationsReceived: { some: { user1Id: userId } } },
          ],
          id: { not: userId },
        },
        select: { id: true },
        take: 200,
      });
      const friendIds = friends.map((f) => f.id);

      if (friendIds.length === 0) {
        const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
          `SELECT COUNT(*) AS total FROM news_share_post nsp
           JOIN news n ON n.id = nsp.news_id
           WHERE nsp.share_option = 3 AND nsp.friends_user_id = ?`,
          userId
        );
        total = Number(countRows[0]?.total ?? 0);

        if (total === 0) {
          return NextResponse.json({ posts: [], total: 0, totalPages: 0 });
        }

        rows = await prisma.$queryRawUnsafe<ShareRow[]>(
          `SELECT nsp.id AS share_id, nsp.user_id AS sharer_id, nsp.news_id,
                  nsp.is_reshare_disabled, nsp.is_comments_enabled, nsp.created AS shared_at,
                  n.title AS news_title, n.image AS news_image,
                  n.author AS news_author, n.originalAuthor AS news_original_author,
                  n.newsCategoryId AS news_category_id
           FROM news_share_post nsp
           JOIN news n ON n.id = nsp.news_id
           WHERE nsp.share_option = 3 AND nsp.friends_user_id = ?
           ORDER BY nsp.created DESC
           LIMIT ? OFFSET ?`,
          userId, limit, skip
        );
      } else {
        const ph = friendIds.map(() => '?').join(',');

        const countRows = await prisma.$queryRawUnsafe<CountRow[]>(
          `SELECT COUNT(*) AS total FROM (
             SELECT nsp.id FROM news_share_post nsp
             JOIN news n ON n.id = nsp.news_id
             WHERE nsp.user_id IN (${ph}) AND nsp.share_option = 2
             UNION ALL
             SELECT nsp.id FROM news_share_post nsp
             JOIN news n ON n.id = nsp.news_id
             WHERE nsp.share_option = 3 AND nsp.friends_user_id = ?
           ) AS combined`,
          ...friendIds, userId
        );
        total = Number(countRows[0]?.total ?? 0);

        rows = await prisma.$queryRawUnsafe<ShareRow[]>(
          `SELECT combined.* FROM (
             SELECT nsp.id AS share_id, nsp.user_id AS sharer_id, nsp.news_id,
                    nsp.is_reshare_disabled, nsp.is_comments_enabled, nsp.created AS shared_at,
                    n.title AS news_title, n.image AS news_image,
                    n.author AS news_author, n.originalAuthor AS news_original_author,
                    n.newsCategoryId AS news_category_id
             FROM news_share_post nsp
             JOIN news n ON n.id = nsp.news_id
             WHERE nsp.user_id IN (${ph}) AND nsp.share_option = 2
             UNION ALL
             SELECT nsp.id AS share_id, nsp.user_id AS sharer_id, nsp.news_id,
                    nsp.is_reshare_disabled, nsp.is_comments_enabled, nsp.created AS shared_at,
                    n.title AS news_title, n.image AS news_image,
                    n.author AS news_author, n.originalAuthor AS news_original_author,
                    n.newsCategoryId AS news_category_id
             FROM news_share_post nsp
             JOIN news n ON n.id = nsp.news_id
             WHERE nsp.share_option = 3 AND nsp.friends_user_id = ?
           ) AS combined
           ORDER BY combined.shared_at DESC
           LIMIT ? OFFSET ?`,
          ...friendIds, userId, limit, skip
        );
      }
    }

    const sharerIds    = Array.from(new Set(rows.map((r) => r.sharer_id).filter(Boolean)));
    const categoryIds  = Array.from(new Set(rows.map((r) => r.news_category_id).filter((v): v is string => v !== null)));

    const [sharers, categories] = await Promise.all([
      sharerIds.length > 0
        ? prisma.user.findMany({
            where: { id: { in: sharerIds } },
            select: { id: true, username: true },
          })
        : Promise.resolve([]),
      categoryIds.length > 0
        ? prisma.newsCategory.findMany({
            where: { id: { in: categoryIds } },
            select: { id: true, categoryName: true },
          })
        : Promise.resolve([]),
    ]);

    const sharerMap   = new Map(sharers.map((u) => [u.id, u.username]));
    const categoryMap = new Map(categories.map((c) => [c.id, c.categoryName]));

    const posts = rows.map((row) => ({
      shareId:            row.share_id,
      newsId:             row.news_id,
      title:              row.news_title || '',
      image:              row.news_image || null,
      author:             row.news_author || row.news_original_author || null,
      createdAt:          row.shared_at ? new Date(row.shared_at).toISOString() : new Date().toISOString(),
      isReshareDisabled:  Boolean(row.is_reshare_disabled),
      isCommentsEnabled:  Boolean(row.is_comments_enabled),
      sharerUsername:     sharerMap.get(row.sharer_id) ?? null,
      category:           row.news_category_id
        ? { id: row.news_category_id, categoryName: categoryMap.get(row.news_category_id) ?? '' }
        : null,
    }));

    return NextResponse.json({
      posts,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch shared posts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
