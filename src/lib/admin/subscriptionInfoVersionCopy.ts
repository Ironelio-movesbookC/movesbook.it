import {
  getSubscriptionEditData,
  getSubscriptionRowsByUserType,
} from '@/lib/admin/subscriptionSettingsMock';
import type { SubscriptionUserType } from '@/types/adminSubscriptionSettings';

export type InfoVersionCopySource = {
  id: number;
  label: string;
};

export function getInfoVersionCopySourceOptions(
  currentSubscriptionId: number,
  userType: SubscriptionUserType,
): InfoVersionCopySource[] {
  return getSubscriptionRowsByUserType(userType)
    .filter((row) => row.id !== currentSubscriptionId && row.name && !row.isTemplate)
    .map((row) => ({
      id: row.id,
      label: row.code ? `${row.code} — ${row.name}` : row.name,
    }));
}

export function copyInfoVersionFromSubscription(
  sourceSubscriptionId: number,
): Record<string, string> | null {
  const source = getSubscriptionEditData(sourceSubscriptionId);
  if (!source) return null;
  return { ...source.general.sloganByLang };
}
