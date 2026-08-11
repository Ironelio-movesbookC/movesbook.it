import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext, procedureService } from '@/lib/procedures';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { type: string; id: string } };

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const body = (await request.json()) as {
      documentType?: string;
      documentNumber?: string;
      annotations?: string;
      confirmDuplicate?: boolean;
    };

    await procedureService.updateReceipt(auth.ctx, params.type, params.id, {
      documentType: body.documentType,
      documentNumber: body.documentNumber,
      annotations: body.annotations,
      confirmDuplicate: body.confirmDuplicate,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && (error as Error & { duplicate?: boolean }).duplicate) {
      return NextResponse.json({ error: error.message, duplicate: true }, { status: 409 });
    }
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: message === 'Receipt not found' ? 404 : 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    await procedureService.deleteReceipt(auth.ctx, params.type, params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: message === 'Receipt not found' ? 404 : 500 });
  }
}
