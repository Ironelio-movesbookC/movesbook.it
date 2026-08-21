import type { PcuSettings } from '@/lib/admin/userPcuSettings';

export type PcuAlertTrigger = 'login' | 'logout';

export type PcuAlertDisplayPayload = {
  title: string;
  bodyHtml: string;
};

/** Normalize stored PCU alert dates for `<input type="date">` (local calendar day). */
export function normalizePcuAlertDateToInput(
  value: string | undefined | null,
): string {
  if (!value?.trim()) return '';
  const s = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function normalizeDateKey(value: string | undefined): string | null {
  const normalized = normalizePcuAlertDateToInput(value);
  return normalized || null;
}

function todayKey(now: Date): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Inclusive local-date range; empty from/to means no bound on that side. */
export function isPcuAlertDateInRange(
  enableFrom: string | undefined,
  enableTo: string | undefined,
  now = new Date(),
): boolean {
  const today = todayKey(now);
  const fromKey = normalizeDateKey(enableFrom);
  const toKey = normalizeDateKey(enableTo);
  if (fromKey && today < fromKey) return false;
  if (toKey && today > toKey) return false;
  return true;
}

export function shouldShowPcuAlertMsg(
  alertMsg: PcuSettings['alertMsg'] | undefined,
  trigger: PcuAlertTrigger,
  now = new Date(),
): boolean {
  if (!alertMsg?.activated) return false;
  if (!isPcuAlertDateInRange(alertMsg.enableFrom, alertMsg.enableTo, now)) return false;
  const showAt = alertMsg.showAt;
  if (trigger === 'login' && !showAt?.login) return false;
  if (trigger === 'logout' && !showAt?.logout) return false;
  return true;
}

export function getPcuAlertHtml(
  alertMsg: PcuSettings['alertMsg'] | undefined,
  lang: string,
): string {
  const htmlByLang = alertMsg?.htmlByLang ?? {};
  const key = lang === 'it' ? 'it' : 'en';
  return (htmlByLang[key] ?? htmlByLang.en ?? htmlByLang.it ?? '').trim();
}

/** Split saved alert HTML into a red headline (first heading) and body for display. */
export function parseAlertMessagePreview(html: string): { title: string; bodyHtml: string } {
  const trimmed = html.trim();
  if (!trimmed) return { title: '', bodyHtml: '' };

  const headingMatch = trimmed.match(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/i);
  if (headingMatch) {
    const title = headingMatch[1].replace(/<[^>]+>/g, '').trim();
    const bodyHtml = trimmed.slice(headingMatch.index! + headingMatch[0].length).trim();
    return { title, bodyHtml };
  }

  const pMatch = trimmed.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (pMatch) {
    const plain = pMatch[1].replace(/<[^>]+>/g, '').trim();
    if (plain.length > 0 && plain.length < 120) {
      const bodyHtml = trimmed.slice(pMatch.index! + pMatch[0].length).trim();
      return { title: plain, bodyHtml };
    }
  }

  return { title: '', bodyHtml: trimmed };
}

export function resolvePcuAlertDisplay(
  pcu: PcuSettings | null | undefined,
  trigger: PcuAlertTrigger,
  lang: string,
  now = new Date(),
): PcuAlertDisplayPayload | null {
  const alertMsg = pcu?.alertMsg;
  if (!shouldShowPcuAlertMsg(alertMsg, trigger, now)) return null;
  const html = getPcuAlertHtml(alertMsg, lang);
  if (!html) return null;
  const parsed = parseAlertMessagePreview(html);
  if (!parsed.title && !parsed.bodyHtml) return null;
  return parsed;
}
