import { z } from 'zod';
import type { CreateProcedureRecordInput } from '../types';

/** PHP typology_of_deadline values from debt_member.ctp */
export const MEMBER_DEBT_TYPOLOGY_OPTIONS = [
  { value: '1', label: 'Memberships' },
  { value: '2', label: 'Subscriptions' },
  { value: '3', label: 'Services' },
  { value: '4', label: 'Sellings' },
  { value: '5', label: 'Member debts' },
  { value: '7', label: 'Employee debt' },
] as const;

const typologyValues = MEMBER_DEBT_TYPOLOGY_OPTIONS.map((o) => o.value) as [string, ...string[]];

export const createMemberDebtRecordSchema = z.object({
  memberId: z.string().min(1),
  totalAmount: z.number().positive(),
  recordDate: z.string().min(1),
  dueDate: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  causal: z.string().min(1),
  operatorId: z.string().optional().nullable(),
  typologyOfDeadline: z.enum(typologyValues).default('5'),
  companyId: z.string().optional().nullable(),
  companyName: z.string().optional().nullable(),
  /** When true, client redirects to payment form after create. */
  openPaymentAfterSave: z.boolean().optional(),
});

export type CreateMemberDebtRecordPayload = z.infer<typeof createMemberDebtRecordSchema>;

function typologyLabel(code: string): string {
  return MEMBER_DEBT_TYPOLOGY_OPTIONS.find((o) => o.value === code)?.label ?? 'Member debts';
}

export function mapMemberDebtCreateToInput(
  data: CreateMemberDebtRecordPayload
): CreateProcedureRecordInput {
  const causal = data.causal.trim();
  const typologyCode = data.typologyOfDeadline ?? '5';
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
      debtLabel: causal || 'Member debt',
      typologyOfDeadline: typologyCode,
      typologyName,
      causal,
      companyId: data.companyId ?? null,
      companyName: data.companyName ?? null,
      openPaymentAfterSave: data.openPaymentAfterSave ?? false,
    },
    operatorId: data.operatorId,
    serviceName: causal || 'Member debt',
  };
}
