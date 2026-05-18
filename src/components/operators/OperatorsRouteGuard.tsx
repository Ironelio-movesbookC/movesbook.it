'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  canAccessOperatorSuperAdminSettings,
  isStaffForbiddenPath,
  isStaffPanelSession,
  isSuperAdminSettingsPath,
  panelAccessDeniedRedirect,
  readNormalizedPanelSession,
  readPanelToken,
  staffHomePath,
} from '@/lib/panelSession';

const STAFF_DETAIL_SEGMENT =
  /^\/operators\/(?:profile|settings|password-settings|super-admin-settings|myCustomers|logins)\/([^/]+)/;

const COADMIN_SETTINGS_SEGMENT =
  /^\/operators\/operator_coadmin_settings\/([^/]+)\/([^/]+)/;

/** Guards all /operators/* routes for panel auth and staff RBAC. */
export function OperatorsRouteGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = readPanelToken();
    const session = readNormalizedPanelSession();

    if (!token || !session) {
      router.replace('/?showAdmin=true');
      return;
    }

    const path = pathname ?? '';

    if (isSuperAdminSettingsPath(path)) {
      const targetId = path.match(/^\/operators\/super-admin-settings\/([^/]+)/)?.[1] ?? '';
      if (!canAccessOperatorSuperAdminSettings(session, targetId)) {
        router.replace(panelAccessDeniedRedirect(session));
        return;
      }
    }

    if (isStaffPanelSession(session)) {
      if (isStaffForbiddenPath(path, session)) {
        router.replace(staffHomePath(session.id));
        return;
      }

      const detailMatch = path.match(STAFF_DETAIL_SEGMENT);
      if (detailMatch && detailMatch[1] !== session.id) {
        router.replace(staffHomePath(session.id));
        return;
      }

      const coAdminMatch = path.match(COADMIN_SETTINGS_SEGMENT);
      if (coAdminMatch && coAdminMatch[2] !== session.id) {
        router.replace(staffHomePath(session.id));
        return;
      }
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-gray-500">
        Loading…
      </div>
    );
  }

  return <>{children}</>;
}
