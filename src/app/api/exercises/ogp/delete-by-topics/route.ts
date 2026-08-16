import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser } from '../../auth';
import { requireCategory } from '../../category';

/**
 * Delete exercise OGP articles by topic (and optional date range) within a category.
 * Only admin/super admin can call this. Permanently deletes matching OGPs.
 * Body: { category: string, topics: string[], fromDate?: string (YYYY-MM-DD), toDate?: string (YYYY-MM-DD) }
 */
export async function POST(request: NextRequest) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { isAdmin } = auth;

  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Only admin or super admin can delete OGPs by topic' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const category = requireCategory(body.category);
    if (category instanceof NextResponse) return category;

    const rawTopics = body.topics;
    const topics: string[] = Array.isArray(rawTopics)
      ? rawTopics.filter((t: unknown) => typeof t === 'string' && t.trim()).map((t: string) => t.trim())
      : [];

    if (topics.length === 0) {
      return NextResponse.json(
        { error: 'At least one topic is required' },
        { status: 400 }
      );
    }

    const fromDateStr = typeof body.fromDate === 'string' && body.fromDate.trim() ? body.fromDate.trim() : null;
    const toDateStr = typeof body.toDate === 'string' && body.toDate.trim() ? body.toDate.trim() : null;

    const where: {
      category: string;
      topic: { in: string[] };
      savedAt?: { gte?: Date; lte?: Date };
    } = {
      category,
      topic: { in: topics },
    };

    if (fromDateStr) {
      const from = new Date(fromDateStr + 'T00:00:00.000Z');
      if (!Number.isNaN(from.getTime())) {
        where.savedAt = { ...where.savedAt, gte: from };
      }
    }
    if (toDateStr) {
      const to = new Date(toDateStr + 'T23:59:59.999Z');
      if (!Number.isNaN(to.getTime())) {
        where.savedAt = { ...where.savedAt, lte: to };
      }
    }

    const result = await prisma.exerciseOgpArticle.deleteMany({ where });
    return NextResponse.json({ ok: true, deletedCount: result.count });
  } catch (e) {
    console.error('POST /api/exercises/ogp/delete-by-topics', e);
    return NextResponse.json({ error: 'Failed to delete OGPs' }, { status: 500 });
  }
}
