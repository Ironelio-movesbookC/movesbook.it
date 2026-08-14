import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { closeOpenUserLoginLog } from '@/lib/loginLogSession';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const token = authHeader.slice(7);
  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }

  try {
    await closeOpenUserLoginLog(decoded.userId);
    // Drop heartbeat so lastSeen-based UIs also flip offline immediately.
    try {
      await prisma.user.update({
        where: { id: decoded.userId },
        data: { lastSeenAt: new Date(Date.now() - 60_000) },
      });
    } catch {
      /* optional */
    }
  } catch {
    /* login log optional */
  }

  return NextResponse.json({ success: true });
}
