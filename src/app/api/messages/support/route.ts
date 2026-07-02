import { NextRequest, NextResponse } from 'next/server';
import { requireMessageAuth } from '@/lib/messages/messageAuth';
import {
  createThreadWithFirstMessage,
  listSupportFeed,
  listThreadsForUser,
  type SupportCategory,
} from '@/lib/messages/userThreads';

export const dynamic = 'force-dynamic';

const CATEGORIES: SupportCategory[] = ['feedback', 'question', 'suggestion', 'problem'];

function parseCategory(raw: string | null): SupportCategory | '' {
  if (!raw) return '';
  return CATEGORIES.includes(raw as SupportCategory) ? (raw as SupportCategory) : '';
}

export async function GET(request: NextRequest) {
  const auth = await requireMessageAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const feed = searchParams.get('feed') === '1';

  try {
    if (feed) {
      const items = await listSupportFeed(auth.userId, {
        category: parseCategory(searchParams.get('category')),
        languageCode: searchParams.get('lang') || '',
        mineOnly: searchParams.get('mine') === '1',
        recentOnly: searchParams.get('recent') === '1',
      });
      return NextResponse.json({ items });
    }

    const items = await listThreadsForUser(auth.userId, 'SUPPORT');
    return NextResponse.json({ items });
  } catch (e) {
    console.error('GET /api/messages/support', e);
    return NextResponse.json({ error: 'Failed to load support' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireMessageAuth(request);
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const text = typeof body?.body === 'string' ? body.body.trim() : '';
    if (!text) return NextResponse.json({ error: 'Message body required' }, { status: 400 });

    const category = parseCategory(body?.supportCategory ?? 'feedback') || 'feedback';

    const thread = await createThreadWithFirstMessage({
      userId: auth.userId,
      kind: 'SUPPORT',
      subject: typeof body?.subject === 'string' ? body.subject : '',
      body: text,
      languageCode: typeof body?.languageCode === 'string' ? body.languageCode : undefined,
      pathStaff: typeof body?.pathStaff === 'string' ? body.pathStaff : undefined,
      realPath: typeof body?.realPath === 'string' ? body.realPath : undefined,
      errorMessage: typeof body?.errorMessage === 'string' ? body.errorMessage : undefined,
      supportCategory: category,
    });

    return NextResponse.json({ id: thread.id });
  } catch (e) {
    console.error('POST /api/messages/support', e);
    return NextResponse.json({ error: 'Failed to create support thread' }, { status: 500 });
  }
}
