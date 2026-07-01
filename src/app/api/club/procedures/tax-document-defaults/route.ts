import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext } from '@/lib/procedures';
import { fetchTaxDocumentClubSettings } from '@/lib/club/otherSettingsReader';
import { buildTaxDocumentDefaults } from '@/lib/procedures/taxDocumentDefaults';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const documentType = request.nextUrl.searchParams.get('documentType')?.trim() || undefined;
    const settings = await fetchTaxDocumentClubSettings({
      userId: auth.ctx.userId,
      clubId: auth.ctx.club.id,
    });
    const defaults = buildTaxDocumentDefaults(settings, documentType);

    return NextResponse.json({ settings, defaults });
  } catch (error) {
    console.error('GET tax-document-defaults:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
