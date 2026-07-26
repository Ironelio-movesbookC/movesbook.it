import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

/** GET - Country online/all counts and connected users for admin chat panel. */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.replace('Bearer ', ''));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const users = await prisma.user.findMany({
      where: { superAdminId: null },
      select: {
        id: true,
        name: true,
        username: true,
        country: true,
        userType: true,
        lastSeenAt: true,
        image: true,
      },
      orderBy: { lastSeenAt: 'desc' },
    });

    const now = Date.now();
    const byCountry = new Map<string, { online: number; all: number }>();

    for (const u of users) {
      const country = (u.country || 'Unknown').trim() || 'Unknown';
      const entry = byCountry.get(country) ?? { online: 0, all: 0 };
      entry.all += 1;
      if (u.lastSeenAt != null && now - u.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS) {
        entry.online += 1;
      }
      byCountry.set(country, entry);
    }

    const countries = [...byCountry.entries()]
      .map(([name, counts]) => ({ name, online: counts.online, all: counts.all }))
      .sort((a, b) => b.all - a.all || a.name.localeCompare(b.name));

    const totalOnline = countries.reduce((sum, c) => sum + c.online, 0);
    const totalAll = users.length;

    const connectedUsers = users
      .filter((u) => u.lastSeenAt != null && now - u.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS)
      .slice(0, 30)
      .map((u) => ({
        id: u.id,
        name: u.name || u.username,
        location: u.country || '',
        role: u.userType,
        avatar: u.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.username)}`,
      }));

    const subscribers = users.map((u) => ({
      id: u.id,
      name: (u.name || u.username || 'User').trim() || 'User',
      image: u.image || null,
      isOnline: u.lastSeenAt != null && now - u.lastSeenAt.getTime() < ONLINE_THRESHOLD_MS,
      lastSeenAt: u.lastSeenAt?.toISOString() ?? null,
    }));

    return NextResponse.json({
      chatUsersCount: totalAll,
      totalOnline,
      totalAll,
      countries,
      connectedUsers,
      subscribers,
    });
  } catch (error) {
    console.error('Chat admin-stats GET:', error);
    return NextResponse.json({ error: 'Failed to load chat stats' }, { status: 500 });
  }
}
