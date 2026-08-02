import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireMessageAuth } from '@/lib/messages/messageAuth';
import {
  addReplyToThread,
  canReplyToThread,
  getThreadForUser,
} from '@/lib/messages/userThreads';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMessageAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const communityReview = searchParams.get('communityReview') === '1';
    const detail = await getThreadForUser(id, auth.userId, auth.isStaff, {
      allowCommunityReview: communityReview,
    });
    if (!detail) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(detail);
  } catch (e) {
    console.error('GET /api/messages/threads/[id]', e);
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireMessageAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await request.json();
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!text) return NextResponse.json({ error: 'Message body required' }, { status: 400 });

    const thread = await prisma.userMessageThread.findUnique({ where: { id } });
    if (!thread) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!canReplyToThread(thread, auth.userId, auth.isStaff)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await addReplyToThread({
      threadId: id,
      senderId: auth.isStaff ? null : auth.userId,
      isStaff: auth.isStaff,
      body: text,
    });

    const detail = await getThreadForUser(id, auth.userId, auth.isStaff, {
      allowCommunityReview: false,
    });
    return NextResponse.json(detail);
  } catch (e) {
    console.error('POST /api/messages/threads/[id]', e);
    return NextResponse.json({ error: 'Failed to reply' }, { status: 500 });
  }
}
