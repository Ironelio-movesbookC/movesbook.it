import { z } from 'zod';
import type { CreateProcedureRecordInput } from '../types';

export const MEMBER_CREDIT_TYPOLOGY_OPTIONS = [
  { value: '6', label: 'Member credits' },
  { value: '8', label: 'Employ to pay' },
] as const;

const typologyValues = MEMBER_CREDIT_TYPOLOGY_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const createMemberCreditRecordSchema = z.object({
  memberId: z.string().min(1),
  totalAmount: z.number().positive(),
  recordDate: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  causal: z.string().min(1),
  operatorId: z.string().optional().nullable(),
  typologyOfDeadline: z.enum(typologyValues).default('6'),
  companyId: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  /** When true, client redirects to payment form after create. */
  openPaymentAfterSave: z.boolean().optional(),
});

export type CreateMemberCreditRecordPayload = z.infer<typeof createMemberCreditRecordSchema>;

function typologyLabel(code: string): string {
  return MEMBER_CREDIT_TYPOLOGY_OPTIONS.find((o) => o.value === code)?.label ?? 'Member credit';
}

export function mapMemberCreditCreateToInput(
  data: CreateMemberCreditRecordPayload
): CreateProcedureRecordInput {
  const causal = data.causal.trim();
  const typologyCode = data.typologyOfDeadline ?? '6';
  const typologyName = typologyLabel(typologyCode);
  const dueDate = data.dueDate ?? data.recordDate;

  return {
    memberId: data.memberId,
    totalAmount: data.totalAmount,
    initialPayment: 0,
    recordDate: data.recordDate,
    dueDate,
    paymentDate: dueDate,
    notes: causal,
    metadata: {
      creditLabel: causal || 'Member credit',
      typologyOfDeadline: typologyCode,
      typologyName,
      causal,
      companyId: data.companyId ?? null,
      companyName: data.companyName ?? null,
      openPaymentAfterSave: data.openPaymentAfterSave ?? false,
    },
    operatorId: data.operatorId,
    serviceName: causal || 'Member credit',
  };
}
