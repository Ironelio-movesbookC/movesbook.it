import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';

export function getUserIdFromRequest(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const decoded = verifyToken(authHeader.slice(7));
  return decoded?.userId ?? null;
}

export function requireAuth(request: NextRequest): { userId: string } | NextResponse {
  const userId = getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return { userId };
}
