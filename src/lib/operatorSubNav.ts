import type {
  OperatorNavTabId,
  OperatorNavVariant,
  StaffKind,
} from '@/lib/operatorNavTabs';

export type OperatorSubNavState = {
  operatorId: string;
  activeTabId: OperatorNavTabId;
  variant: OperatorNavVariant;
};

/** Routes that show the operator sub-tab strip (Profile, Settings, Logins, …). */
export function operatorsRouteHasSubNav(pathname: string | null): boolean {
  if (!pathname) return false;
  return /^\/operators\/(?:profile|password-settings|settings|myCustomers|logins|super-admin-settings|assign-coadmin|assign-operator|operator_coadmin_settings)\//.test(
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

  m = pathname.match(/^\/operators\/assign-coadmin\/([^/]+)/);
  if (m) {
    return {
      operatorId: m[1],
      activeTabId: 'assign-coadmin',
      variant: { kind: 'standard', viewedStaffKind: 'OPERATOR' },
    };
  }

  m = pathname.match(/^\/operators\/assign-operator\/([^/]+)/);
  if (m) {
    return {
      operatorId: m[1],
      activeTabId: 'assign-coadmin',
      variant: { kind: 'standard', viewedStaffKind: 'CO_ADMIN' },
    };
  }

  return null;
}

function parseStaffKind(value: unknown): StaffKind | undefined {
  if (value === 'OPERATOR' || value === 'CO_ADMIN') return value;
  return undefined;
}

export function readOperatorNavVariantFromSession(): OperatorNavVariant {
  if (typeof window === 'undefined') return { kind: 'standard' };
  try {
    const raw = sessionStorage.getItem('operatorNavVariant');
    if (!raw) return { kind: 'standard' };
    const parsed = JSON.parse(raw) as OperatorNavVariant & { viewedStaffKind?: unknown };
    const viewedStaffKind = parseStaffKind(parsed.viewedStaffKind);
    if (parsed?.kind === 'myCustomers') {
      return { kind: 'myCustomers', viewedStaffKind };
    }
    if (parsed?.kind === 'standard') {
      return { kind: 'standard', viewedStaffKind };
    }
    // Legacy session values from old co-admin settings URLs are ignored.
  } catch {
    /* ignore */
  }
  return { kind: 'standard' };
}

/** Remember profile context (operator vs co-admin) for sub-tab labels when opening from a list. */
export function persistOperatorNavContext(
  viewedStaffKind: StaffKind,
  base: OperatorNavVariant = { kind: 'standard' },
): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      'operatorNavVariant',
      JSON.stringify({ ...base, viewedStaffKind }),
    );
    window.dispatchEvent(new Event('operatorNavContextUpdated'));
  } catch {
    /* ignore */
  }
}

/** Pathname wins over session so nav links never use a stale variant after route changes. */
export function resolveOperatorNavVariant(pathname: string | null): OperatorNavVariant {
  const fromPath = parseOperatorSubNavFromPath(pathname);
  const fromSession = readOperatorNavVariantFromSession();
  if (fromPath) {
    return {
      ...fromPath.variant,
      viewedStaffKind: fromPath.variant.viewedStaffKind ?? fromSession.viewedStaffKind,
    };
  }
  return fromSession;
}
