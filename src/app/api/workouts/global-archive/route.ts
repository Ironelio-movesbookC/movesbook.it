import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { mapGlobalEntryToGridRecord } from '@/lib/globalWorkoutArchiveMapper';
import type { GlobalArchiveRecordType } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** GET — Browse enabled global archive entries (authenticated users). */
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
    const recordType = searchParams.get('recordType') as GlobalArchiveRecordType | null;
    const sport = searchParams.get('sport');
    const search = searchParams.get('search')?.trim();

    const entries = await prisma.globalWorkoutArchiveEntry.findMany({
      where: {
        disabled: false,
        ...(recordType ? { recordType } : {}),
        ...(sport && sport !== 'all' ? { mainSport: sport } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { tags: { contains: search } },
                { shortDescription: { contains: search } },
                { sharedByUsername: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ sharedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      records: entries.map((entry) => ({
        ...mapGlobalEntryToGridRecord(entry),
        archiveSource: 'global' as const,
      })),
    });
  } catch (error) {
    console.error('GET workouts/global-archive:', error);
    return NextResponse.json({ error: 'Failed to load global archive' }, { status: 500 });
  }
}
