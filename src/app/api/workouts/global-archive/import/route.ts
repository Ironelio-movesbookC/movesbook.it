import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { importGlobalArchiveEntry } from '@/lib/importGlobalArchiveEntry';

export const dynamic = 'force-dynamic';

/** POST — Import a global archive entry into the user's personal archive / settings. */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { globalEntryId, targetWeekId, targetDayId, sessionNumber } = body as {
      globalEntryId?: string;
      targetWeekId?: string;
      targetDayId?: string;
      sessionNumber?: number;
    };

    if (!globalEntryId) {
      return NextResponse.json({ error: 'globalEntryId is required' }, { status: 400 });
    }

    const result = await importGlobalArchiveEntry(prisma, decoded.userId, globalEntryId, {
      targetWeekId,
      targetDayId,
      sessionNumber,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('POST global-archive/import:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to import from global archive',
      },
      { status: 500 }
    );
  }
}
