import { NextRequest, NextResponse } from 'next/server';
import {
  getClubAuthContext,
  fetchPurchases,
  createServicePurchase,
  softDeletePurchase,
  fetchFormOptions,
} from '@/lib/club/servicePurchasesDb';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const view = request.nextUrl.searchParams.get('view');
    if (view === 'form-options') {
      const options = await fetchFormOptions(auth.ctx.club.id);
      return NextResponse.json(options);
    }

    const onlyWithRest = view === 'deadlines';
    const purchaseId = request.nextUrl.searchParams.get('id') ?? undefined;
    const purchases = await fetchPurchases(auth.ctx.club.id, {
      onlyWithRest,
      purchaseId,
    });

    return NextResponse.json({ purchases, clubId: auth.ctx.club.id });
  } catch (error) {
    console.error('GET purchases error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const value = Number(body.value);
    const pay = body.pay != null && body.pay !== '' ? Number(body.pay) : 0;

    if (!body.userId) {
      return NextResponse.json({ error: 'Member is required', fieldErrors: { userId: 'Required' } }, { status: 400 });
    }
    if (!body.serviceId) {
      return NextResponse.json({ error: 'Service is required', fieldErrors: { serviceId: 'Required' } }, { status: 400 });
    }
    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json({ error: 'Invalid cost', fieldErrors: { value: 'Invalid' } }, { status: 400 });
    }
    if (!body.paydate) {
      return NextResponse.json({ error: 'Date is required', fieldErrors: { paydate: 'Required' } }, { status: 400 });
    }
    if (pay > value) {
      return NextResponse.json({ error: 'Payment exceeds total cost' }, { status: 400 });
    }

    const result = await createServicePurchase(auth.ctx, {
      userId: String(body.userId),
      sectorId: String(body.sectorId || ''),
      serviceId: String(body.serviceId),
      value,
      pay,
      paydate: String(body.paydate),
      notes: body.notes ? String(body.notes) : '',
      payMode: body.payMode ? String(body.payMode) : undefined,
      operatorId: body.operatorId ? String(body.operatorId) : auth.ctx.userId,
      createReceipt: Boolean(body.createReceipt) && pay > 0,
      receiptDocumentType: body.receiptDocumentType ? String(body.receiptDocumentType) : 'Invoice',
      receiptNumber: body.receiptNumber ? String(body.receiptNumber) : undefined,
      receiptAnnotations: body.receiptAnnotations ? String(body.receiptAnnotations) : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('POST purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const id = request.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    await softDeletePurchase(auth.ctx.club.id, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
