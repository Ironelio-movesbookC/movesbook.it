import type { OperatorNavTabId, OperatorNavVariant } from '@/lib/operatorNavTabs';

export type OperatorSubNavState = {
  operatorId: string;
  activeTabId: OperatorNavTabId;
  variant: OperatorNavVariant;
};

/** Routes that show the operator sub-tab strip (Profile, Settings, Logins, …). */
export function operatorsRouteHasSubNav(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/operators\/(?:profile|password-settings|settings|myCustomers|logins|super-admin-settings|operator_coadmin_settings)\//.test(
    pathname,
  );
}

export function parseOperatorSubNavFromPath(pathname: string | null): OperatorSubNavState | null {
  if (!pathname) return null;

  let m = pathname.match(/^\/operators\/profile\/([^/]+)/);
  if (m) {
    return { operatorId: m[1], activeTabId: 'profile', variant: { kind: 'standard' } };
  }

  m = pathname.match(/^\/operators\/password-settings\/([^/]+)/);
  if (m) {
    return { operatorId: m[1], activeTabId: 'settings', variant: { kind: 'standard' } };
  }

  m = pathname.match(/^\/operators\/settings\/([^/]+)/);
  if (m) {
    return { operatorId: m[1], activeTabId: 'settings', variant: { kind: 'myCustomers' } };
  }

  m = pathname.match(/^\/operators\/myCustomers\/([^/]+)/);
  if (m) {
    return { operatorId: m[1], activeTabId: 'customers', variant: { kind: 'myCustomers' } };
  }

  m = pathname.match(/^\/operators\/logins\/([^/]+)/);
  if (m) {
    return { operatorId: m[1], activeTabId: 'logins', variant: { kind: 'standard' } };
  }

  m = pathname.match(/^\/operators\/super-admin-settings\/([^/]+)/);
  if (m) {
    return { operatorId: m[1], activeTabId: 'super-admin', variant: { kind: 'standard' } };
  }

  return null;
}

export function readOperatorNavVariantFromSession(): OperatorNavVariant {
  if (typeof window === 'undefined') return { kind: 'standard' };
  try {
    const raw = sessionStorage.getItem('operatorNavVariant');
    if (!raw) return { kind: 'standard' };
    const parsed = JSON.parse(raw) as OperatorNavVariant;
    if (parsed?.kind === 'myCustomers') return { kind: 'myCustomers' };
    // Legacy session values from old co-admin settings URLs are ignored.
  } catch {
    /* ignore */
  }
  return { kind: 'standard' };
}

/** Pathname wins over session so nav links never use a stale variant after route changes. */
export function resolveOperatorNavVariant(pathname: string | null): OperatorNavVariant {
  const fromPath = parseOperatorSubNavFromPath(pathname);
  if (fromPath && fromPath.variant.kind !== 'standard') {
    return fromPath.variant;
  }
  return readOperatorNavVariantFromSession();
}
