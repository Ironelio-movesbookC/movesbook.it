import { NextRequest, NextResponse } from 'next/server';
import {
  getVersionHistoryArticle,
  listVersionHistoryArticles,
  saveVersionHistoryArticles,
} from '@/lib/messages/versionHistory';
import { verifySuperAdminPassword } from '@/lib/messages/verifySuperAdminPassword';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const langId = searchParams.get('langId');
    const q = searchParams.get('q');
    const languageCode = searchParams.get('lang');

    if (id) {
      const article = await getVersionHistoryArticle(id);
      if (!article) {
        return NextResponse.json({ error: 'not_found' }, { status: 404 });
      }
      return NextResponse.json(article);
    }

    const payload = await listVersionHistoryArticles({ langId, q, languageCode });
    return NextResponse.json(payload);
  } catch (error) {
    console.error('version-history GET error:', error);
    return NextResponse.json({ articles: [], languages: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const password = String(body.password ?? '');
    if (!(await verifySuperAdminPassword(password))) {
      return NextResponse.json({ error: 'invalid_password' }, { status: 401 });
    }

    const result = await saveVersionHistoryArticles({
      password,
      sourceLangCode: String(body.sourceLangCode ?? 'en'),
      articleGroup: body.articleGroup ?? null,
      editArticleId: body.editArticleId ?? null,
      translations: body.translations ?? {},
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'save_failed';
    console.error('version-history POST error:', error);
    const status = message === 'version_history_table_missing' ? 503 : 400;
    return NextResponse.json(
      {
        error: message,
        hint:
          message === 'version_history_table_missing'
            ? 'Could not create or access why_movesbook_sections. Check DATABASE_URL and MySQL permissions.'
            : undefined,
      },
      { status },
    );
  }
}
