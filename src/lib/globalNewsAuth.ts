import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/** Bearer token must belong to an active super_admins row (Admin Management login). */
export async function requireTableSuperAdmin(
  request: NextRequest,
): Promise<{ superAdminId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const decoded = verifyToken(authHeader.slice(7));
  if (!decoded?.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { id: decoded.userId, isActive: true },
    select: { id: true },
  });
  if (superAdmin) return { superAdminId: superAdmin.id };

  return NextResponse.json({ error: 'Super admin only' }, { status: 403 });
}

export type GlobalNewsFeedItem =
  | {
      kind: 'news';
      id: string;
      title: string | null;
      date: string;
      author: string | null;
      categoryName: string | null;
      method: string | null;
      image: string | null;
      inGlobalNews: true;
    }
  | {
      kind: 'ogp';
      id: string;
      title: string | null;
      date: string;
      topic: string;
      creatorUsername: string | null;
      image: string | null;
      url: string;
      description: string | null;
      customDescription: string | null;
      inGlobalNews: true;
    };
