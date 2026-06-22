import type { Decimal } from '@prisma/client/runtime/library';

export const PROCEDURE_TYPE_CODES = {
  SERVICE_SALE: 'service_sale',
  EXPENSE: 'expense',
} as const;

export type ProcedureTypeCode =
  (typeof PROCEDURE_TYPE_CODES)[keyof typeof PROCEDURE_TYPE_CODES];

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type ClubAuthContext = {
  userId: string;
  club: { id: string; name: string };
};

export type ProcedureRecordDto = {
  id: string;
  procedureTypeCode: string;
  clubId: string;
  memberId: string;
  memberName: string;
  operatorId: string | null;
  operatorName: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  recordDate: string;
  dueDate: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  lastPaymentDate: string | null;
};

export type ProcedurePaymentDto = {
  id: string;
  procedureRecordId: string;
  memberName: string;
  amount: number;
  paymentDate: string;
  operatorId: string | null;
  operatorName: string;
  payMode: string | null;
  notes: string | null;
  serviceName: string | null;
  typology: string;
  balanceAfter: number | null;
};

export type ProcedureReceiptDto = {
  id: string;
  procedureRecordId: string;
  procedurePaymentId: string | null;
  memberName: string;
  documentType: string | null;
  documentNumber: string | null;
  amount: number;
  paymentAmount: number;
  serviceName: string | null;
  receiptDate: string;
  annotations: string | null;
  typology: string;
  operatorName: string;
};

export type CreateProcedureRecordInput = {
  memberId: string;
  totalAmount: number;
  initialPayment?: number;
  recordDate: string;
  dueDate?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  operatorId?: string | null;
  payMode?: string | null;
  createReceipt?: boolean;
  receiptDocumentType?: string | null;
  receiptNumber?: string | null;
  receiptAnnotations?: string | null;
  serviceName?: string | null;
};

export type AddProcedurePaymentInput = {
  amount: number;
  paymentDate: string;
  notes?: string | null;
  operatorId?: string | null;
  payMode?: string | null;
  createReceipt?: boolean;
  receiptDocumentType?: string | null;
  receiptNumber?: string | null;
  receiptAnnotations?: string | null;
  serviceName?: string | null;
};

export type ListQuery = {
  page?: number;
  pageSize?: number;
  memberId?: string;
  recordId?: string;
};

export function decimalToNumber(value: Decimal | number | string): number {
  return Number(value);
}
