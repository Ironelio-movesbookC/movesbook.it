import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

/** GET - List users who have a Telegram account (for starting a chat). Excludes current user. */
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
    const myId = decoded.userId;

    const users = await prisma.user.findMany({
      where: {
        id: { not: myId },
        telegramAccount: { not: null },
      },
      select: { id: true, name: true, username: true, telegramAccount: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error('Chat users GET:', error);
    return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
  }
}
