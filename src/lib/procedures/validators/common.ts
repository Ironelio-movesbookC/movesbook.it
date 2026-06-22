import { z } from 'zod';

/** Shared payment payload — same for all procedure types. */
export const addProcedurePaymentSchema = z.object({
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

export type AddProcedurePaymentPayload = z.infer<typeof addProcedurePaymentSchema>;
