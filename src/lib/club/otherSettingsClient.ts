'use client';

import { clubApiFetch } from '@/lib/club/servicePurchasesClient';

export type OtherPaymentSettings = {
  formPayDeadlineStatus: string;
  operatorPassStatus: string;
  calTaxStatus: boolean;
};

export async function fetchOtherSettings(): Promise<OtherPaymentSettings> {
  const res = await clubApiFetch<{ settings: OtherPaymentSettings }>(
    '/api/club/settings/other-settings'
  );
  return res.settings;
}
