import { z } from 'zod';
import type { CreateProcedureRecordInput } from '../types';

export const createExpenseRecordSchema = z.object({
  memberId: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  initialPayment: z.number().nonnegative().optional(),
  recordDate: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  expenseId: z.string().optional().nullable(),
  expenseName: z.string().optional().nullable(),
  operatorId: z.string().optional().nullable(),
  payMode: z.string().optional().nullable(),
  createReceipt: z.boolean().optional(),
  receiptDocumentType: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  receiptAnnotations: z.string().optional().nullable(),
});

export type CreateExpenseRecordPayload = z.infer<typeof createExpenseRecordSchema>;

export function mapExpenseCreateToInput(
  data: CreateExpenseRecordPayload
): CreateProcedureRecordInput {
  const expenseName = data.expenseName?.trim() || 'Expense';
  return {
    memberId: data.memberId,
    totalAmount: data.totalAmount,
    initialPayment: data.initialPayment,
    recordDate: data.recordDate,
    dueDate: data.dueDate,
    notes: data.notes,
    metadata: {
      expenseId: data.expenseId ?? null,
      expenseName,
    },
    operatorId: data.operatorId,
    payMode: data.payMode,
    createReceipt: data.createReceipt,
    receiptDocumentType: data.receiptDocumentType,
    receiptNumber: data.receiptNumber,
    receiptAnnotations: data.receiptAnnotations,
    serviceName: expenseName,
  };
}
