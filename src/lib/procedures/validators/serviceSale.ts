import { z } from 'zod';
import type { CreateProcedureRecordInput } from '../types';

export const createServiceSaleRecordSchema = z.object({
  memberId: z.string().min(1),
  totalAmount: z.number().nonnegative(),
  initialPayment: z.number().nonnegative().optional(),
  recordDate: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  sectorId: z.string().optional().nullable(),
  serviceId: z.string().optional().nullable(),
  serviceName: z.string().optional().nullable(),
  sectorName: z.string().optional().nullable(),
  operatorId: z.string().optional().nullable(),
  payMode: z.string().optional().nullable(),
  createReceipt: z.boolean().optional(),
  receiptDocumentType: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  receiptAnnotations: z.string().optional().nullable(),
});

export type CreateServiceSaleRecordPayload = z.infer<typeof createServiceSaleRecordSchema>;

export function mapServiceSaleCreateToInput(
  data: CreateServiceSaleRecordPayload
): CreateProcedureRecordInput {
  return {
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
  };
}
