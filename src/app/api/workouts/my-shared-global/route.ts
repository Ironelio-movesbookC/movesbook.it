import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { mapGlobalEntryToGridRecord } from '@/lib/globalWorkoutArchiveMapper';
import { parseWeeklyPlanShareMeta } from '@/lib/globalWeeklyPlanShare';
import { parseWorkoutShareMeta } from '@/lib/globalWorkoutShare';

export const dynamic = 'force-dynamic';

/** GET — Global archive entries shared by the current user (for Share/Unshare UI). */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recordType = searchParams.get('recordType');

    const entries = await prisma.globalWorkoutArchiveEntry.findMany({
      where: {
        sharedByUserId: decoded.userId,
        disabled: false,
        ...(recordType ? { recordType: recordType as 'WORKOUT' | 'WEEKLY_PLAN' } : {}),
      },
      orderBy: [{ sharedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      records: entries.map((entry) => ({
        ...mapGlobalEntryToGridRecord(entry),
        archiveSource: 'global' as const,
        shareMeta:
          entry.recordType === 'WORKOUT'
            ? parseWorkoutShareMeta(entry.payloadData)
            : parseWeeklyPlanShareMeta(entry.payloadData),
      })),
    });
  } catch (error) {
    console.error('GET my-shared-global:', error);
    return NextResponse.json({ error: 'Failed to load shared entries' }, { status: 500 });
  }
}
