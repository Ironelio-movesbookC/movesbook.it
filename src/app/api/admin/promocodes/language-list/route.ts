import { NextRequest, NextResponse } from 'next/server';
import { requirePromocodeAccess } from '@/lib/promocodes/promocodeAccess';
import { getLanguageListForHelpPage } from '@/lib/promocodes/promocodeService';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const auth = await requirePromocodeAccess(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await request.json();
    const pageTitle = String(body.html_doc_title ?? body.pageTitle ?? '');
    const languages = await getLanguageListForHelpPage(pageTitle);
    return NextResponse.json(languages);
  } catch (e) {
    console.error('promocodes language-list POST:', e);
    return NextResponse.json({ error: 'Failed to load languages' }, { status: 500 });
  }
}
