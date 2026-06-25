import { NextRequest, NextResponse } from 'next/server';
import { loadVersionHistory } from '@/lib/messages/versionHistory';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const langId = searchParams.get('langId');
    const sectionId = searchParams.get('sectionId');
    const languageCode = searchParams.get('lang');

    const payload = await loadVersionHistory({
      langId,
      sectionId,
      languageCode,
    });

    return NextResponse.json(payload);
  } catch (error) {
    console.error('version-history error:', error);
    return NextResponse.json(
      {
        langId: '1',
        languages: [],
        sections: [],
        selectedSectionId: null,
        content: '',
      },
      { status: 500 },
    );
  }
}
