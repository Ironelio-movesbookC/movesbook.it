import {
  parseClubDescriptionMeta,
  type ClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';
import { sanitizeDefaultPaymentMethods } from '@/lib/procedures/payModes';

export function getClubDefaultPaymentMethods(
  description: string | null | undefined,
): string[] {
  const meta = parseClubDescriptionMeta(description);
  return sanitizeDefaultPaymentMethods(meta.defaultPaymentMethods);
}

export function mergeClubDefaultPaymentMethodsForSave(
  existingDescription: string | null | undefined,
  methods: string[],
): string {
  const prev = parseClubDescriptionMeta(existingDescription);
  const meta: ClubDescriptionMeta = {
    ...prev,
    createdViaForm: prev.createdViaForm ?? true,
    defaultPaymentMethods: sanitizeDefaultPaymentMethods(methods),
  };
  return JSON.stringify(meta);
}
