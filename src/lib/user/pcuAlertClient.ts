import type { PcuAlertDisplayPayload, PcuAlertTrigger } from '@/lib/admin/userPcuAlertMsg';

export const PENDING_PCU_ALERT_KEY = 'pendingPcuAlert';

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
): Promise<PcuAlertDisplayPayload | null> {
  if (typeof window === 'undefined') return null;
  const token = localStorage.getItem('token');
  if (!token) return null;

  const langCode =
    lang?.trim().toLowerCase() ||
    localStorage.getItem('language')?.trim().toLowerCase() ||
    'en';

  const params = new URLSearchParams({ trigger, lang: langCode });
  const res = await fetch(`/api/user/pcu-alert?${params.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { show?: boolean; alert?: PcuAlertDisplayPayload };
  if (!data.show || !data.alert?.bodyHtml) return null;
  return {
    title: data.alert.title ?? '',
    bodyHtml: data.alert.bodyHtml,
  };
}
