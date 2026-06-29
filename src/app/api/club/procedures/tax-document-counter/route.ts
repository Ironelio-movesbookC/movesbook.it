import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getClubAuthContext } from '@/lib/procedures';
import { updateTaxDocumentCounter } from '@/lib/club/otherSettingsReader';

export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  documentType: z.string().min(1),
  documentNumber: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const payload = bodySchema.parse(await request.json());
    await updateTaxDocumentCounter(
      { userId: auth.ctx.userId, clubId: auth.ctx.club.id },
      payload.documentType,
      payload.documentNumber
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid payload', details: error.flatten() }, { status: 400 });
    }
    console.error('POST tax-document-counter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
