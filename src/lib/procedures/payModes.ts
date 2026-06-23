export const PAY_MODE_OPTIONS = [
  { value: 'cash', label: 'Cash', legacyCode: '1' },
  { value: 'bank_check', label: 'Bank check', legacyCode: '2' },
  { value: 'card', label: 'Credit card', legacyCode: '3' },
  { value: 'transfer', label: 'Bank Transfer', legacyCode: '4' },
  { value: 'voucher', label: 'Credit Voucher', legacyCode: '6' },
] as const;

export type PayModeValue = (typeof PAY_MODE_OPTIONS)[number]['value'];

export function payModeLabel(value: string | null | undefined): string {
  const found = PAY_MODE_OPTIONS.find((o) => o.value === value);
  return found?.label ?? value ?? '-';
}

export function legacyPayModeToValue(code: string | number | null | undefined): PayModeValue {
  const key = String(code ?? '');
  const found = PAY_MODE_OPTIONS.find((o) => o.legacyCode === key);
  return found?.value ?? 'cash';
}
