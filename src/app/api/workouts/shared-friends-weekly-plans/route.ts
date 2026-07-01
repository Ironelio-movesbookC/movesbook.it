import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { mapGlobalEntryToGridRecord } from '@/lib/globalWorkoutArchiveMapper';
import { getFriendUsers } from '@/lib/userFriends';
import { isShareableArchiveRecord } from '@/lib/shareableArchive';

export const dynamic = 'force-dynamic';

/**
 * GET — Shareable workouts or weekly plans from friends only (General Archive + shareable tag).
 */
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

    const friends = await getFriendUsers(decoded.userId);
    const friendIds = friends.map((f) => f.id);

    if (friendIds.length === 0) {
      return NextResponse.json({ records: [], friends: [] });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim().toLowerCase();
    const sport = searchParams.get('sport');
    const language = searchParams.get('language');
    const friendId = searchParams.get('friendId');
    const recordTypeParam = searchParams.get('recordType') ?? 'WEEKLY_PLAN';
    const recordType =
      recordTypeParam === 'WORKOUT' ? 'WORKOUT' : 'WEEKLY_PLAN';

    let sharedByFilter = friendIds;
    if (friendId && friendId !== 'all') {
      if (!friendIds.includes(friendId)) {
        return NextResponse.json({ records: [], friends });
      }
      sharedByFilter = [friendId];
    }

    const now = new Date();

    const entries = await prisma.globalWorkoutArchiveEntry.findMany({
      where: {
        disabled: false,
        recordType,
        sharedByUserId: { in: sharedByFilter },
        OR: [{ expirationDate: null }, { expirationDate: { gt: now } }],
        ...(sport && sport !== 'all' ? { mainSport: sport } : {}),
      },
      orderBy: [{ sharedAt: 'desc' }, { createdAt: 'desc' }],
    });

    let records = entries
      .filter((entry) => isShareableArchiveRecord(entry.tags))
      .map((entry) => ({
        ...mapGlobalEntryToGridRecord(entry),
        archiveSource: 'global' as const,
      }));

    if (language && language !== 'all') {
      records = records.filter((r) => {
        const langs = (r.originalLanguages ?? '')
          .split(',')
          .map((l) => l.trim().toLowerCase())
          .filter(Boolean);
        return langs.length === 0 || langs.includes(language.toLowerCase());
      });
    }

    if (search) {
      records = records.filter((r) => {
        const haystack = [
          r.title,
          r.tags ?? '',
          r.sharedByUsername ?? '',
          r.authorFullName ?? '',
          r.mainSport ?? '',
          r.shortDescription ?? '',
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(search);
      });
    }

    return NextResponse.json({ records, friends });
  } catch (error) {
    console.error('GET shared-friends-weekly-plans:', error);
    return NextResponse.json(
      { error: 'Failed to load friends shared archive entries' },
      { status: 500 }
    );
  }
}
