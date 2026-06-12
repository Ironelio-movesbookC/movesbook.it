import type { PcuAlertDisplayPayload, PcuAlertTrigger } from '@/lib/admin/userPcuAlertMsg';
import { isClubAccountUserType } from '@/utils/dashboardRouting';

export const PENDING_PCU_ALERT_KEY = 'pendingPcuAlert';

function hasPcuAlertContent(alert: PcuAlertDisplayPayload | undefined | null): boolean {
  return Boolean(alert?.bodyHtml?.trim() || alert?.title?.trim());
}

/** Club admin personal login: show PCU when opening My Club, not at sign-in. */
export function shouldDeferPcuLoginToClubOpen(
  userType: string,
  entityAccessMode?: string,
): boolean {
  if (!isClubAccountUserType(userType)) return false;
  return (
    entityAccessMode !== 'company-password' &&
    entityAccessMode !== 'direct-access-only'
  );
}

export function shouldShowPcuAtLogin(
  userType: string,
  entityAccessMode?: string,
): boolean {
  return !shouldDeferPcuLoginToClubOpen(userType, entityAccessMode);
}

export function storePendingPcuAlert(alert: PcuAlertDisplayPayload): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(PENDING_PCU_ALERT_KEY, JSON.stringify(alert));
}

export function consumePendingPcuAlert(): PcuAlertDisplayPayload | null {
  if (typeof window === 'undefined') return null;
  const raw = sessionStorage.getItem(PENDING_PCU_ALERT_KEY);
  sessionStorage.removeItem(PENDING_PCU_ALERT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PcuAlertDisplayPayload;
    if (typeof parsed.bodyHtml !== 'string') return null;
    return {
      title: typeof parsed.title === 'string' ? parsed.title : '',
      bodyHtml: parsed.bodyHtml,
    };
  } catch {
    return null;
  }
}

export async function fetchPcuAlert(
  trigger: PcuAlertTrigger,
  lang?: string,
  entityId?: string | null,
): Promise<PcuAlertDisplayPayload | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;

  const langCode =
    lang?.trim().toLowerCase() ||
    localStorage.getItem('language')?.trim().toLowerCase() ||
    'en';

  const params = new URLSearchParams({ trigger, lang: langCode });
  const scopedEntityId = entityId?.trim();
  if (scopedEntityId) {
    params.set('entityId', scopedEntityId);
    params.set('clubId', scopedEntityId);
  }
  const res = await fetch(`/api/user/pcu-alert?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { show?: boolean; alert?: PcuAlertDisplayPayload };
  if (!data.show || !hasPcuAlertContent(data.alert)) return null;
  return {
    title: data.alert?.title ?? '',
    bodyHtml: data.alert?.bodyHtml ?? '',
  };
}
