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

export type OperatorNavVariant =
  | { kind: 'standard' }
  | { kind: 'myCustomers' }
  | { kind: 'coadmin'; coadminId: string };

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
      if (variant.kind === 'coadmin') {
        return `/operators/operator_coadmin_settings/${operatorId}/${variant.coadminId}`;
      }
      if (variant.kind === 'myCustomers') {
        return `/operators/operator_coadmin_settings/${operatorId}/40`;
      }
      return `/operators/super-admin-settings/${operatorId}`;
    case 'customers':
      return `/operators/myCustomers/${operatorId}`;
    case 'logins':
      return `/operators/logins/${operatorId}`;
    case 'assign-coadmin':
      return '/admin/add-co-admin';
    default:
      return '#';
  }
}
