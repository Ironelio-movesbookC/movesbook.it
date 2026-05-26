/** Client-side panel session parsed from localStorage `adminUser`. */

export type PanelSessionUser = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  userType?: string;
  isStaff?: boolean;
  staffKind?: 'OPERATOR' | 'CO_ADMIN';
  isSuperAdmin?: boolean;
};

export function readPanelSession(): PanelSessionUser | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('adminUser');
    if (!raw) return null;
    return JSON.parse(raw) as PanelSessionUser;
  } catch {
    return null;
  }
}

/** Normalize legacy ADMIN sessions so guards and hooks agree on super-admin access. */
export function normalizePanelSession(user: PanelSessionUser | null): PanelSessionUser | null {
  if (!user) return null;
  if (isFullAdminPanelSession(user) && !user.isSuperAdmin) {
    return { ...user, isSuperAdmin: true, userType: user.userType ?? 'ADMIN' };
  }
  return user;
}

export function readNormalizedPanelSession(): PanelSessionUser | null {
  return normalizePanelSession(readPanelSession());
}

export function readPanelToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('adminToken');
}

export function isStaffPanelSession(user: PanelSessionUser | null): boolean {
  if (!user) return false;
  return Boolean(
    user.isStaff ||
      user.staffKind === 'OPERATOR' ||
      user.staffKind === 'CO_ADMIN' ||
      user.userType === 'STAFF_OPERATOR' ||
      user.userType === 'STAFF_CO_ADMIN',
  );
}

/** Super Admin or legacy `users_new` ADMIN — not operator / co-admin staff. */
export function isFullAdminPanelSession(user: PanelSessionUser | null): boolean {
  if (!user || isStaffPanelSession(user)) return false;
  return Boolean(user.isSuperAdmin || user.userType === 'ADMIN');
}

/** Same as {@link isFullAdminPanelSession} — used for super-admin settings & staff management UI. */
export function isSuperAdminPanelSession(user: PanelSessionUser | null): boolean {
  return isFullAdminPanelSession(user);
}

export function canManageStaffAccounts(user: PanelSessionUser | null): boolean {
  return isFullAdminPanelSession(normalizePanelSession(user));
}

/** Super Admin / panel admin for any operator; staff only for their own account id. */
export function canAccessOperatorSuperAdminSettings(
  user: PanelSessionUser | null,
  staffAccountId: string,
): boolean {
  const session = normalizePanelSession(user);
  if (!session || !staffAccountId) return false;
  if (isSuperAdminPanelSession(session)) return true;
  return false;
}

/** Operator routes that use admin dashboard chrome (sidebars + toggles). */
export function operatorsRouteUsesAdminChrome(pathname: string | null): boolean {
  if (!pathname?.startsWith('/operators')) return false;
  if (pathname === '/operators' || pathname === '/operators/usersAssignedStaff') return true;
  return /^\/operators\/(?:profile|password-settings|settings|myCustomers|logins|super-admin-settings|assign-coadmin|assign-operator)\//.test(
    pathname,
  );
}

/** Admin paths reserved for super admin / panel admins only (not operator / co-admin staff). */
export const STAFF_FORBIDDEN_ADMIN_PATH_PREFIXES = [
  '/admin/add-co-admin',
  '/admin/add-operator',
  '/admin/all-staff',
] as const;

/** Paths staff must not open under /operators (staff directory). */
export const STAFF_FORBIDDEN_OPERATORS_PATH_PREFIXES = ['/operators/usersAssignedStaff'] as const;

export function isStaffForbiddenPath(
  pathname: string,
  session?: PanelSessionUser | null,
): boolean {
  if (pathname === '/operators') return true;
  if (STAFF_FORBIDDEN_ADMIN_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (STAFF_FORBIDDEN_OPERATORS_PATH_PREFIXES.some((p) => pathname.startsWith(p))) return true;
  if (isSuperAdminSettingsPath(pathname)) {
    const m = pathname.match(/^\/operators\/super-admin-settings\/([^/]+)/);
    const targetId = m?.[1] ?? '';
    if (targetId && canAccessOperatorSuperAdminSettings(session ?? null, targetId)) {
      return false;
    }
    return true;
  }
  if (pathname.startsWith('/settings/admin-management')) return true;
  if (pathname === '/settings' || pathname.startsWith('/settings/')) return true;
  return false;
}

export function staffHomePath(staffAccountId: string): string {
  return `/operators/profile/${staffAccountId}`;
}

export function isSuperAdminSettingsPath(pathname: string): boolean {
  return pathname.startsWith('/operators/super-admin-settings/');
}

/** Where non–super-admin users go when they hit super-admin settings. */
export function panelAccessDeniedRedirect(session: PanelSessionUser | null): string {
  if (isStaffPanelSession(session) && session?.id) {
    return staffHomePath(session.id);
  }
  return '/admin/dashboard';
}
