import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveNutritionDatabaseUserId } from '@/lib/nutritionUserId';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const dbUserId = await resolveNutritionDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const ids = body.ids as string[] | undefined;
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array required' }, { status: 400 });
    }

    const result = await prisma.sportMachine.deleteMany({
      where: { userId: dbUserId, id: { in: ids } },
    });

    return NextResponse.json({ success: true, deleted: result.count });
  } catch (e) {
    console.error('sport-machines bulk-delete', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
