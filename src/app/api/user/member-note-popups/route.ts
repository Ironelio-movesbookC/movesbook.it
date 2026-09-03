import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type PopupRow = {
  id: string;
  title: string;
  body: string;
  clubName: string;
  enableFrom: Date | string | null;
  enableTo: Date | string | null;
  showAtLogin: number | boolean;
  showAtLogout: number | boolean;
};

function todayYmdLocal() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dateYmd(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4}-\d{2}-\d{2})/);
    if (m) return m[1];
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function inRange(from: Date | string | null, to: Date | string | null, today: string): boolean {
  const fromYmd = dateYmd(from);
  const toYmd = dateYmd(to);
  if (fromYmd && today < fromYmd) return false;
  if (toYmd && today > toYmd) return false;
  return true;
}

/**
 * Active coach-note documents for the logged-in member to show as login/logout popups.
 * Query: moment=login|logout
 */
export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const decoded = verifyToken(token);
  const userId = decoded?.userId;
  if (!userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  const moment = (request.nextUrl.searchParams.get('moment') || 'login').trim().toLowerCase();
  if (moment !== 'login' && moment !== 'logout') {
    return NextResponse.json({ error: 'moment must be login or logout' }, { status: 400 });
  }

  let rows: PopupRow[] = [];
  try {
    // COLLATE avoids utf8mb4_unicode_ci vs utf8mb4_general_ci join failures across tables.
    rows = await prisma.$queryRawUnsafe<PopupRow[]>(
      `SELECT n.id, n.title, n.body, c.name AS clubName,
              n.enableFrom, n.enableTo, n.showAtLogin, n.showAtLogout
       FROM club_member_notes n
       INNER JOIN club_members_new cm
         ON cm.id = n.clubMemberId COLLATE utf8mb4_unicode_ci
       INNER JOIN clubs_new c
         ON c.id COLLATE utf8mb4_unicode_ci = cm.clubId COLLATE utf8mb4_unicode_ci
       WHERE cm.memberId COLLATE utf8mb4_unicode_ci = ?
         AND n.parentId IS NULL
         AND n.kind = 'coach'
         AND n.visibleToMember = 1
       ORDER BY n.createdAt DESC`,
      userId,
    );
  } catch (e) {
    console.error('member-note-popups query failed', e);
    return NextResponse.json({ error: 'Failed to load popups' }, { status: 500 });
  }

  const today = todayYmdLocal();
  const items = rows
    .filter((row) => {
      const atLogin = Boolean(Number(row.showAtLogin));
      const atLogout = Boolean(Number(row.showAtLogout));
      if (moment === 'login' && !atLogin) return false;
      if (moment === 'logout' && !atLogout) return false;
      return inRange(row.enableFrom, row.enableTo, today);
    })
    .map((row) => ({
      id: row.id,
      title: row.title || 'Coach note',
      body: row.body,
      clubName: row.clubName,
      enableFrom: dateYmd(row.enableFrom) || '',
      enableTo: dateYmd(row.enableTo) || '',
    }));

  return NextResponse.json({ moment, today, items });
}
