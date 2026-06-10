/**
 * Single primary nav strip for operator admin sub-pages (Profile … Logins).
 * Hrefs differ slightly between standard operator pages, My Customers, and co-admin settings.
 */

export const OPERATOR_NAV_TABS = [
  { id: 'profile', label: 'Profile' },
  { id: 'curriculum', label: 'curriculum' },
  { id: 'settings', label: 'Settings' },
  { id: 'super-admin', label: 'Super Admin settings' },
  { id: 'assign-coadmin', label: 'Assign a new Co-admin' },
  { id: 'customers', label: 'My Customers' },
  { id: 'orders', label: 'Orders' },
  { id: 'payments', label: 'Payments' },
  { id: 'visits', label: 'Visits' },
  { id: 'mylist', label: 'My list' },
  { id: 'logins', label: 'Logins' },
] as const;

export type OperatorNavTabId = (typeof OPERATOR_NAV_TABS)[number]['id'];

export type StaffKind = 'OPERATOR' | 'CO_ADMIN';

export type OperatorNavVariant =
  | { kind: 'standard'; viewedStaffKind?: StaffKind }
  | { kind: 'myCustomers'; viewedStaffKind?: StaffKind }
  | { kind: 'coadmin'; coadminId: string; viewedStaffKind?: StaffKind };

/** Label for the assign tab depends on which profile type is open. */
export function getOperatorNavTabLabel(
  tabId: OperatorNavTabId,
  variant: OperatorNavVariant,
): string {
  const tab = OPERATOR_NAV_TABS.find((t) => t.id === tabId);
  if (!tab) return '';
  if (tabId === 'assign-coadmin') {
    return variant.viewedStaffKind === 'CO_ADMIN'
      ? 'Assign a new Operator'
      : 'Assign a new Co-admin';
  }
  return tab.label;
}

/** Tabs visible for the current panel session (staff vs panel admin). */
export function getVisibleOperatorNavTabs(options?: {
  isStaff?: boolean;
  staffKind?: 'OPERATOR' | 'CO_ADMIN';
  isSuperAdmin?: boolean;
  canManageStaff?: boolean;
  /** Operator/co-admin id in the current URL (for staff self-access). */
  operatorId?: string;
  sessionId?: string;
}) {
  const canManage = Boolean(options?.canManageStaff ?? options?.isSuperAdmin);
  return OPERATOR_NAV_TABS.filter((tab) => {
    if (tab.id === 'super-admin') return canManage;
    if (tab.id === 'assign-coadmin') {
      if (canManage) return true;
      return (
        Boolean(options?.isStaff) &&
        options?.staffKind === 'CO_ADMIN' &&
        Boolean(options?.operatorId && options?.sessionId) &&
        options!.operatorId === options!.sessionId
      );
    }
    if (!options?.isStaff) return true;
    return true;
  });
}

export function getOperatorNavHref(
  tabId: OperatorNavTabId,
  operatorId: string,
  variant: OperatorNavVariant,
): string {
  const legacySettings = variant.kind === 'myCustomers' || variant.kind === 'coadmin';
  const settingsHref = legacySettings
    ? `/operators/settings/${operatorId}`
    : `/operators/password-settings/${operatorId}`;

  switch (tabId) {
    case 'profile':
      return `/operators/profile/${operatorId}`;
    case 'settings':
      return settingsHref;
    case 'super-admin':
      return `/operators/super-admin-settings/${operatorId}`;
    case 'customers':
      return `/operators/myCustomers/${operatorId}`;
    case 'logins':
      return `/operators/logins/${operatorId}`;
    case 'assign-coadmin':
      return variant.viewedStaffKind === 'CO_ADMIN'
        ? `/operators/assign-operator/${operatorId}`
        : `/operators/assign-coadmin/${operatorId}`;
    default:
      return '#';
  }
}
