import { NextRequest, NextResponse } from 'next/server';
import {
  getClubAuthContext,
  fetchPurchases,
  addPaymentToPurchase,
} from '@/lib/club/servicePurchasesDb';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const purchases = await fetchPurchases(auth.ctx.club.id, {
      purchaseId: params.id,
    });

    if (!purchases[0]) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    return NextResponse.json({ purchase: purchases[0] });
  } catch (error) {
    console.error('GET purchase error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const amountPaid = Number(body.amountPaid);

    if (!Number.isFinite(amountPaid) || amountPaid <= 0) {
      return NextResponse.json({ error: 'Invalid payment amount' }, { status: 400 });
    }
    if (!body.paymentDate) {
      return NextResponse.json({ error: 'Payment date is required' }, { status: 400 });
    }

    const result = await addPaymentToPurchase(auth.ctx, params.id, {
      amountPaid,
      paymentDate: String(body.paymentDate),
      notes: body.notes ? String(body.notes) : '',
      payMode: body.payMode ? String(body.payMode) : undefined,
      operatorId: body.operatorId ? String(body.operatorId) : auth.ctx.userId,
      createReceipt: Boolean(body.createReceipt),
      receiptDocumentType: body.receiptDocumentType ? String(body.receiptDocumentType) : 'Invoice',
      receiptNumber: body.receiptNumber ? String(body.receiptNumber) : undefined,
      receiptAnnotations: body.receiptAnnotations ? String(body.receiptAnnotations) : undefined,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message === 'Purchase not found' ? 404 : message.includes('Payment') ? 400 : 500;
    console.error('POST payment error:', error);
    return NextResponse.json({ error: message }, { status });
  }
}
