import { NextRequest, NextResponse } from 'next/server';
import { requireMessageAuth } from '@/lib/messages/messageAuth';
import { toggleThreadReaction } from '@/lib/messages/userThreads';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } },
) {
  const auth = await requireMessageAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const reaction = body?.reaction === 'D' ? 'D' : body?.reaction === 'L' ? 'L' : null;
    if (!reaction) {
      return NextResponse.json({ error: 'reaction must be L or D' }, { status: 400 });
    }

    const result = await toggleThreadReaction(context.params.id, auth.userId, reaction);
    if (!result) {
      return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (e) {
    console.error('POST /api/messages/threads/[id]/like', e);
    return NextResponse.json({ error: 'Failed to update reaction' }, { status: 500 });
  }
}
