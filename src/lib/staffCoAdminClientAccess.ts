import type { PanelSessionUser } from '@/lib/panelSession';
import { isStaffPanelSession } from '@/lib/panelSession';

/** Routes a co-admin may open for operators linked by Super Admin (not self). */
export const COADMIN_LINKED_OPERATOR_PATH_PATTERNS = [
  /^\/operators\/profile\/[^/]+/,
  /^\/operators\/myCustomers\/[^/]+/,
  /^\/operators\/logins\/[^/]+/,
] as const;

export function isCoAdminStaffSession(session: PanelSessionUser | null): boolean {
  if (!session) return false;
  return session.staffKind === 'CO_ADMIN' || session.userType === 'STAFF_CO_ADMIN';
}

export function isCoAdminLinkedOperatorDetailPath(pathname: string): boolean {
  return COADMIN_LINKED_OPERATOR_PATH_PATTERNS.some((p) => p.test(pathname));
}

export function extractStaffDetailTargetId(pathname: string): string | null {
  const m = pathname.match(
    /^\/operators\/(?:profile|settings|password-settings|super-admin-settings|myCustomers|logins|assign-coadmin|assign-operator)\/([^/]+)/,
  );
  return m?.[1] ?? null;
}

function readCachedLinkedOperatorIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = sessionStorage.getItem('coAdminLinkedOperatorIds');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.map((x) => String(x)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Fetch operator ids linked to this co-admin (Super Admin assignments). */
export async function fetchCoAdminLinkedOperatorIds(
  coAdminId: string,
  token: string,
): Promise<string[]> {
  const cached = readCachedLinkedOperatorIds();
  if (cached.length > 0) return cached;

  const res = await fetch(`/api/admin/co-admins/${coAdminId}/operator-links`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return [];
  const rows = Array.isArray(data.assignedOperators) ? data.assignedOperators : [];
  const ids = rows.map((o: { id: string }) => String(o.id)).filter(Boolean);
  try {
    sessionStorage.setItem('coAdminLinkedOperatorIds', JSON.stringify(ids));
  } catch {
    /* ignore */
  }
  return ids;
}

export async function coAdminCanAccessStaffDetailPath(
  session: PanelSessionUser,
  pathname: string,
  token: string,
): Promise<boolean> {
  if (!isCoAdminStaffSession(session)) return false;
  const targetId = extractStaffDetailTargetId(pathname);
  if (!targetId || targetId === session.id) return true;
  if (!isCoAdminLinkedOperatorDetailPath(pathname)) return false;
  const linked = await fetchCoAdminLinkedOperatorIds(session.id, token);
  return linked.includes(targetId);
}

export function operatorStaffCanAccessDetailPath(
  session: PanelSessionUser,
  pathname: string,
): boolean {
  if (!isStaffPanelSession(session) || isCoAdminStaffSession(session)) return true;
  const targetId = extractStaffDetailTargetId(pathname);
  if (!targetId) return true;
  return targetId === session.id;
}
