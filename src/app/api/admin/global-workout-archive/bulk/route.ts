import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import type { GlobalArchiveBulkAction } from '@/lib/globalWorkoutArchivePictures';

export const dynamic = 'force-dynamic';

/** POST — bulk enable / disable / favorite / delete on global archive entries. */
export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, action } = body as { ids?: string[]; action?: GlobalArchiveBulkAction };

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 });
    }
    if (
      !action ||
      !['enable', 'disable', 'favorite', 'unfavorite', 'delete'].includes(action)
    ) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    let affected = 0;

    if (action === 'delete') {
      const result = await prisma.globalWorkoutArchiveEntry.deleteMany({
        where: { id: { in: ids } },
      });
      affected = result.count;
    } else if (action === 'enable') {
      const result = await prisma.globalWorkoutArchiveEntry.updateMany({
        where: { id: { in: ids } },
        data: { disabled: false },
      });
      affected = result.count;
    } else if (action === 'disable') {
      const result = await prisma.globalWorkoutArchiveEntry.updateMany({
        where: { id: { in: ids } },
        data: { disabled: true },
      });
      affected = result.count;
    } else if (action === 'favorite') {
      const result = await prisma.globalWorkoutArchiveEntry.updateMany({
        where: { id: { in: ids } },
        data: { isFavorite: true },
      });
      affected = result.count;
    } else if (action === 'unfavorite') {
      const result = await prisma.globalWorkoutArchiveEntry.updateMany({
        where: { id: { in: ids } },
        data: { isFavorite: false },
      });
      affected = result.count;
    }

    return NextResponse.json({ success: true, affected, action });
  } catch (error) {
    console.error('POST global-workout-archive/bulk:', error);
    return NextResponse.json({ error: 'Bulk action failed' }, { status: 500 });
  }
}
