import { NextResponse } from 'next/server';
import { ensureSponsorSettings, serializeSponsorSettings } from '@/lib/news/ogpSponsorStore';

export const dynamic = 'force-dynamic';

/** GET /api/news/ogp-sponsors — public placement + sponsor cards for the OGP News grid. */
export async function GET() {
  try {
    const row = await ensureSponsorSettings();
    return NextResponse.json(serializeSponsorSettings(row));
  } catch (e) {
    console.error('GET /api/news/ogp-sponsors', e);
    return NextResponse.json({ error: 'Failed to load sponsored news' }, { status: 500 });
  }
}
