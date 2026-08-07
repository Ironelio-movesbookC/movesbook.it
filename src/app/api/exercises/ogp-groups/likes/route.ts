import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews, getUserIdFromRequest } from '../../auth';

/**
 * GET /api/exercises/ogp-groups/likes?ids=id1,id2
 * Response: { [groupId]: { count, likedByMe } }
 */
export async function GET(request: NextRequest) {
  const rawUserId = getUserIdFromRequest(request);
  let effectiveUserId: string | null = null;
  if (rawUserId) {
    const auth = await requireAuthForNews(request);
    if (!(auth instanceof NextResponse)) effectiveUserId = auth.userId;
  }

  const { searchParams } = new URL(request.url);
  const idsParam = searchParams.get('ids');
  const ids = idsParam
    ? idsParam.split(',').map((s) => s.trim()).filter(Boolean)
    : [];

  if (ids.length === 0) {
    return NextResponse.json({});
  }

  try {
    const [counts, myLikes] = await Promise.all([
      prisma.exerciseOgpGroupLike.groupBy({
        by: ['groupId'],
        where: { groupId: { in: ids } },
        _count: { id: true },
      }),
      effectiveUserId
        ? prisma.exerciseOgpGroupLike.findMany({
            where: { groupId: { in: ids }, userId: effectiveUserId },
            select: { groupId: true },
          })
        : [],
    ]);

    const countMap = new Map(counts.map((c) => [c.groupId, c._count.id]));
    const mySet = new Set(myLikes.map((l) => l.groupId));

    const result: Record<string, { count: number; likedByMe: boolean }> = {};
    for (const id of ids) {
      result[id] = {
        count: countMap.get(id) ?? 0,
        likedByMe: effectiveUserId ? mySet.has(id) : false,
      };
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/exercises/ogp-groups/likes', e);
    return NextResponse.json({ error: 'Failed to fetch likes' }, { status: 500 });
  }
}
