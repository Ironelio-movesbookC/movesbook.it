import { z } from 'zod';

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

export const addServiceSalePaymentSchema = z.object({
  amount: z.number().positive(),
  paymentDate: z.string().min(1),
  notes: z.string().optional().nullable(),
  operatorId: z.string().optional().nullable(),
  payMode: z.string().optional().nullable(),
  createReceipt: z.boolean().optional(),
  receiptDocumentType: z.string().optional().nullable(),
  receiptNumber: z.string().optional().nullable(),
  receiptAnnotations: z.string().optional().nullable(),
  serviceName: z.string().optional().nullable(),
});
