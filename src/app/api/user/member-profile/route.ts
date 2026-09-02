import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  loadSelfMemberProfileBundle,
  saveSelfMemberProfileBundle,
} from '@/lib/club/memberProfileService';

export const dynamic = 'force-dynamic';

function getUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token)?.userId ?? null;
}

/** Shared profile sections for the logged-in member (no club required). */
export async function GET(request: NextRequest) {
  const viewerUserId = getUserId(request);
  if (!viewerUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await loadSelfMemberProfileBundle({ userId: viewerUserId });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json(result);
}

export async function PATCH(request: NextRequest) {
  const viewerUserId = getUserId(request);
  if (!viewerUserId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = (body || {}) as Parameters<typeof saveSelfMemberProfileBundle>[0]['payload'];

  const result = await saveSelfMemberProfileBundle({
    userId: viewerUserId,
    payload,
  });
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ success: true });
}
