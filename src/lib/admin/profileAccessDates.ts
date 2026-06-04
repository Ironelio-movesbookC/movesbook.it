import type { PcuAccessSettings } from '@/lib/admin/userPcuAccessSettings';

export type ProfileSubscriptionDateRow = {
  dateStart: string;
  dateEnd?: string | null;
  status?: string;
};

/** Start/End fields for the subscription panel — from entity row, then saved PCU access. */
export function resolveProfileAccessDates(
  rows: ProfileSubscriptionDateRow[],
  pcuAccess?: PcuAccessSettings | null,
  fallback?: { start?: string; end?: string | null },
): { accessStart: string; accessEnd: string } {
  const activeRow =
    rows.find((r) => r.status?.toLowerCase() === 'active') ?? rows[rows.length - 1];
  const accessStart =
    pcuAccess?.accessStartIso?.trim() ||
    activeRow?.dateStart?.trim() ||
    fallback?.start?.trim() ||
    '';
  const accessEnd =
    pcuAccess?.accessEndIso?.trim() ||
    activeRow?.dateEnd?.trim() ||
    fallback?.end?.trim() ||
    '';
  return { accessStart, accessEnd };
}
