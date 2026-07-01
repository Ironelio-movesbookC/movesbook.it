import { NextRequest, NextResponse } from 'next/server';
import { requireMessageAuth } from '@/lib/messages/messageAuth';
import { createThreadWithFirstMessage, listThreadsForUser } from '@/lib/messages/userThreads';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireMessageAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const items = await listThreadsForUser(auth.userId, 'REVIEW');
    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET /api/messages/reviews', e);
    return NextResponse.json({ error: 'Failed to load reviews' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMessageAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!text) return NextResponse.json({ error: 'Message body required' }, { status: 400 });

    const thread = await createThreadWithFirstMessage({
      userId: auth.userId,
      kind: 'REVIEW',
      subject: typeof body?.subject === 'string' ? body.subject : '',
      body: text,
      languageCode: typeof body?.languageCode === 'string' ? body.languageCode : undefined,
      pathStaff: typeof body?.pathStaff === 'string' ? body.pathStaff : undefined,
      realPath: typeof body?.realPath === 'string' ? body.realPath : undefined,
    });

    return NextResponse.json({ id: thread.id });
  } catch (e) {
    console.error('POST /api/messages/reviews', e);
    return NextResponse.json({ error: 'Failed to create review' }, { status: 500 });
  }
}
