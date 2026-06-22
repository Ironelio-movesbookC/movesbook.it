import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext, procedureService } from '@/lib/procedures';
import { createServiceSaleRecordSchema } from '@/lib/procedures/validators/serviceSale';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { type: string } };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const view = request.nextUrl.searchParams.get('view');
    const page = Number(request.nextUrl.searchParams.get('page') ?? 1);
    const pageSize = Number(request.nextUrl.searchParams.get('pageSize') ?? 10);
    const memberId = request.nextUrl.searchParams.get('memberId') ?? undefined;
    const recordId = request.nextUrl.searchParams.get('id') ?? undefined;

    const result = await procedureService.listRecords(
      auth.ctx,
      params.type,
      { page, pageSize, memberId, recordId },
      { onlyWithBalance: view === 'deadlines' }
    );

    return NextResponse.json({ ...result, clubId: auth.ctx.club.id });
  } catch (error) {
    console.error('GET procedure records:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const parsed = createServiceSaleRecordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const result = await procedureService.createRecord(auth.ctx, params.type, {
      memberId: data.memberId,
      totalAmount: data.totalAmount,
      initialPayment: data.initialPayment,
      recordDate: data.recordDate,
      dueDate: data.dueDate,
      notes: data.notes,
      metadata: {
        sectorId: data.sectorId ?? null,
        serviceId: data.serviceId ?? null,
        serviceName: data.serviceName ?? null,
        sectorName: data.sectorName ?? null,
      },
      operatorId: data.operatorId,
      payMode: data.payMode,
      createReceipt: data.createReceipt,
      receiptDocumentType: data.receiptDocumentType,
      receiptNumber: data.receiptNumber,
      receiptAnnotations: data.receiptAnnotations,
      serviceName: data.serviceName,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = message.includes('exceeds') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const id = request.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

    await procedureService.softDeleteRecord(auth.ctx, params.type, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: message === 'Record not found' ? 404 : 500 });
  }
}
