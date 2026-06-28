import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * POST — Remove a user's shared entry from the Global Archive (requires password).
 * Body: { globalEntryId: string, password: string }
 */
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
    const { globalEntryId, password } = body as { globalEntryId?: string; password?: string };

    if (!globalEntryId?.trim()) {
      return NextResponse.json({ error: 'globalEntryId is required' }, { status: 400 });
    }
    if (!password?.trim()) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, password: true },
    });
    if (!user?.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await verifyPassword(password.trim(), user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid password', valid: false }, { status: 403 });
    }

    const entry = await prisma.globalWorkoutArchiveEntry.findUnique({
      where: { id: globalEntryId },
    });
    if (!entry || entry.sharedByUserId !== user.id) {
      return NextResponse.json({ error: 'Shared entry not found' }, { status: 404 });
    }

    await prisma.globalWorkoutArchiveEntry.update({
      where: { id: globalEntryId },
      data: { disabled: true },
    });

    return NextResponse.json({
      success: true,
      message: 'Removed from Global archive of shared workouts & weekly plans',
    });
  } catch (error) {
    console.error('POST unshare-from-global:', error);
    return NextResponse.json({ error: 'Failed to unshare' }, { status: 500 });
  }
}
