'use client';

import { clubApiFetch } from '@/lib/club/servicePurchasesClient';

const PREFIX_MAP: Record<string, string> = {
  'in-': 'service_sale',
  'pin-': 'product_sale',
  'out-': 'expense',
};

export function parseCashMovementId(prefixedId: string): { procedureType: string; paymentId: string } | null {
  const entry = Object.entries(PREFIX_MAP).find(([prefix]) => prefixedId.startsWith(prefix));
  if (!entry) return null;
  return { procedureType: entry[1], paymentId: prefixedId.slice(entry[0].length) };
}

export async function updateCashMovement(
  prefixedId: string,
  input: { paymentDate?: string; notes?: string; operatorId?: string }
): Promise<void> {
  const parsed = parseCashMovementId(prefixedId);
  if (!parsed) throw new Error('Invalid cash movement ID');
  await clubApiFetch(`/api/club/procedures/${parsed.procedureType}/payments/${parsed.paymentId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function deleteCashMovement(prefixedId: string): Promise<void> {
  const parsed = parseCashMovementId(prefixedId);
  if (!parsed) throw new Error('Invalid cash movement ID');
  await clubApiFetch(`/api/club/procedures/${parsed.procedureType}/payments/${parsed.paymentId}`, {
    method: 'DELETE',
  });
}
