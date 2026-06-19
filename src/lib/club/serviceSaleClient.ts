'use client';

import { clubApiFetch } from '@/lib/club/servicePurchasesClient';
import type {
  ProcedurePaymentDto,
  ProcedureReceiptDto,
  ProcedureRecordDto,
} from '@/lib/procedures/types';

export const SERVICE_SALE_TYPE = 'service_sale';
export const BASE = `/api/club/procedures/${SERVICE_SALE_TYPE}`;

export type ServiceSalePurchase = {
  id: string;
  userId: string;
  memberName: string;
  memberImage: string | null;
  typology: string;
  sectorName: string;
  serviceName: string;
  paydate: string | null;
  value: number;
  pay: number;
  rest: number;
  notes: string;
  operatorId: string | null;
  operatorName: string;
  lastPaymentDate: string | null;
};

export type ServiceSalePayment = {
  id: string;
  spId: string;
  memberName: string;
  typology: string;
  serviceName: string;
  paymentDate: string | null;
  paid: number;
  balance: number;
  description: string;
  operatorName: string;
};

export type ServiceSaleReceipt = {
  id: string;
  spId: string;
  memberName: string;
  typology: string;
  serviceName: string;
  receiptDate: string | null;
  documentType: string;
  documentNumber: string;
  cost: number;
  paymentIn: number;
  annotations: string;
  operatorName: string;
};

export type ServiceSaleFormOptions = {
  sectors: { id: string; name: string }[];
  services: { id: string; name: string; sectorId: string; cost: number }[];
  members: { id: string; name: string }[];
};

function metaString(metadata: Record<string, unknown> | null | undefined, key: string): string {
  const value = metadata?.[key];
  return value != null ? String(value).trim() : '';
}

export function mapRecord(record: ProcedureRecordDto): ServiceSalePurchase {
  return {
    id: record.id,
    userId: record.memberId,
    memberName: record.memberName,
    memberImage: null,
    typology: 'SERVICES',
    sectorName: metaString(record.metadata, 'sectorName') || '-',
    serviceName: metaString(record.metadata, 'serviceName') || '-',
    paydate: record.recordDate,
    value: record.totalAmount,
    pay: record.paidAmount,
    rest: record.balanceAmount,
    notes: record.notes ?? '',
    operatorId: record.operatorId,
    operatorName: record.operatorName,
    lastPaymentDate: record.lastPaymentDate,
  };
}

export function mapPayment(payment: ProcedurePaymentDto): ServiceSalePayment {
  return {
    id: payment.id,
    spId: payment.procedureRecordId,
    memberName: payment.memberName,
    typology: payment.typology,
    serviceName: payment.serviceName ?? '-',
    paymentDate: payment.paymentDate,
    paid: payment.amount,
    balance: payment.balanceAfter ?? 0,
    description: payment.notes ?? '',
    operatorName: payment.operatorName,
  };
}

export function mapReceipt(receipt: ProcedureReceiptDto): ServiceSaleReceipt {
  return {
    id: receipt.id,
    spId: receipt.procedureRecordId,
    memberName: receipt.memberName,
    typology: receipt.typology,
    serviceName: receipt.serviceName ?? '-',
    receiptDate: receipt.receiptDate,
    documentType: receipt.documentType ?? 'Invoice',
    documentNumber: receipt.documentNumber ?? '',
    cost: receipt.amount,
    paymentIn: receipt.paymentAmount,
    annotations: receipt.annotations ?? '',
    operatorName: receipt.operatorName,
  };
}

type Paginated<T> = { items: T[]; total: number; page: number; pageSize: number; clubId?: string };

export async function fetchFormOptions(): Promise<ServiceSaleFormOptions> {
  return clubApiFetch<ServiceSaleFormOptions>(`${BASE}/form-options`);
}

export async function fetchServiceCost(serviceId: string): Promise<number | null> {
  const options = await fetchFormOptions();
  const service = options.services.find((s) => s.id === serviceId);
  return service?.cost ?? null;
}

export async function fetchPurchases(): Promise<{ purchases: ServiceSalePurchase[]; clubId?: string }> {
  const res = await clubApiFetch<Paginated<ProcedureRecordDto>>(`${BASE}/records?pageSize=1000`);
  return { purchases: res.items.map(mapRecord), clubId: res.clubId };
}

export async function fetchDeadlines(): Promise<{ purchases: ServiceSalePurchase[] }> {
  const res = await clubApiFetch<Paginated<ProcedureRecordDto>>(
    `${BASE}/records?view=deadlines&pageSize=1000`
  );
  return { purchases: res.items.map(mapRecord) };
}

export async function fetchPurchase(id: string): Promise<{ purchase: ServiceSalePurchase }> {
  const res = await clubApiFetch<{ record: ProcedureRecordDto }>(`${BASE}/records/${id}`);
  return { purchase: mapRecord(res.record) };
}

export type CreatePurchaseInput = {
  userId: string;
  sectorId: string;
  serviceId: string;
  sectorName?: string;
  serviceName?: string;
  value: number;
  pay?: number;
  paydate: string;
  notes?: string;
  payMode?: string;
  createReceipt?: boolean;
  receiptDocumentType?: string;
  receiptNumber?: string;
  receiptAnnotations?: string;
};

export async function createPurchase(input: CreatePurchaseInput): Promise<{ purchaseId: string }> {
  const pay = input.pay ?? 0;
  const result = await clubApiFetch<{ recordId: string }>(`${BASE}/records`, {
    method: 'POST',
    body: JSON.stringify({
      memberId: input.userId,
      totalAmount: input.value,
      initialPayment: pay,
      recordDate: input.paydate,
      notes: input.notes ?? null,
      sectorId: input.sectorId || null,
      serviceId: input.serviceId || null,
      sectorName: input.sectorName ?? null,
      serviceName: input.serviceName ?? null,
      payMode: input.payMode ?? null,
      createReceipt: input.createReceipt && pay > 0,
      receiptDocumentType: input.receiptDocumentType ?? 'Invoice',
      receiptNumber: input.receiptNumber,
      receiptAnnotations: input.receiptAnnotations ?? input.notes,
    }),
  });
  return { purchaseId: result.recordId };
}


export async function deletePurchase(id: string): Promise<void> {
  await clubApiFetch(`${BASE}/records?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export type AddPaymentInput = {
  amountPaid: number;
  paymentDate: string;
  notes?: string;
  payMode?: string;
  createReceipt?: boolean;
  receiptDocumentType?: string;
  receiptNumber?: string;
  receiptAnnotations?: string;
};

export async function addPayment(recordId: string, input: AddPaymentInput): Promise<void> {
  await clubApiFetch(`${BASE}/records/${recordId}`, {
    method: 'POST',
    body: JSON.stringify({
      amount: input.amountPaid,
      paymentDate: input.paymentDate,
      notes: input.notes ?? null,
      payMode: input.payMode ?? null,
      createReceipt: input.createReceipt ?? false,
      receiptDocumentType: input.receiptDocumentType ?? 'Invoice',
      receiptNumber: input.receiptNumber,
      receiptAnnotations: input.receiptAnnotations ?? input.notes,
    }),
  });
}

export async function fetchPayments(): Promise<{ payments: ServiceSalePayment[] }> {
  const res = await clubApiFetch<Paginated<ProcedurePaymentDto>>(`${BASE}/payments?pageSize=1000`);
  return { payments: res.items.map(mapPayment) };
}

export async function fetchPaymentsForRecord(recordId: string): Promise<{ payments: ServiceSalePayment[] }> {
  const res = await clubApiFetch<Paginated<ProcedurePaymentDto>>(
    `${BASE}/payments?recordId=${encodeURIComponent(recordId)}&pageSize=1000`
  );
  return { payments: res.items.map(mapPayment) };
}

export async function fetchReceipts(): Promise<{ receipts: ServiceSaleReceipt[] }> {
  const res = await clubApiFetch<Paginated<ProcedureReceiptDto>>(`${BASE}/receipts?pageSize=1000`);
  return { receipts: res.items.map(mapReceipt) };
}
