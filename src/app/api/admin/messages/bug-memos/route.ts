import { NextRequest, NextResponse } from 'next/server';
import { requireMessageAuth } from '@/lib/messages/messageAuth';
import { createThreadWithFirstMessage, listBugFixedMemos } from '@/lib/messages/userThreads';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await requireMessageAuth(request);
  if (!auth?.isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = new URL(request.url);

  try {
    const result = await listBugFixedMemos({
      searchQuery: searchParams.get('q') || '',
      status: searchParams.get('status') || '',
      page: Number(searchParams.get('page') || '1'),
      pageSize: Number(searchParams.get('pageSize') || '5'),
    });
    return NextResponse.json(result);
  } catch (e) {
    console.error('GET /api/admin/messages/bug-memos', e);
    return NextResponse.json({ error: 'Failed to load bug memos' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMessageAuth(request);
  if (!auth?.isStaff) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  try {
    const body = await request.json();
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!text) return NextResponse.json({ error: 'Message body required' }, { status: 400 });

    const imageUrls = Array.isArray(body?.imageUrls) ? body.imageUrls : [];

    const thread = await createThreadWithFirstMessage({
      userId: auth.userId,
      kind: 'SUPPORT',
      subject: typeof body?.subject === 'string' ? body.subject : '',
      body: text,
      languageCode: typeof body?.languageCode === 'string' ? body.languageCode : undefined,
      pathStaff: typeof body?.pathStaff === 'string' ? body.pathStaff : undefined,
      realPath: typeof body?.realPath === 'string' ? body.realPath : undefined,
      errorMessage: typeof body?.errorMessage === 'string' ? body.errorMessage : undefined,
      supportCategory: 'bug_fixed',
      imageUrls,
    });

    return NextResponse.json({ id: thread.id });
  } catch (e) {
    console.error('POST /api/admin/messages/bug-memos', e);
    return NextResponse.json({ error: 'Failed to save bug memo' }, { status: 500 });
  }
}
