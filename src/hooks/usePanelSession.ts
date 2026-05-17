'use client';

import { useEffect, useState } from 'react';
import {
  canManageStaffAccounts,
  isFullAdminPanelSession,
  isStaffPanelSession,
  readPanelSession,
  type PanelSessionUser,
} from '@/lib/panelSession';

export function usePanelSession() {
  const [session, setSession] = useState<PanelSessionUser | null>(null);

  useEffect(() => {
    const raw = readPanelSession();
    if (raw && isFullAdminPanelSession(raw) && !raw.isSuperAdmin) {
      const updated: PanelSessionUser = { ...raw, isSuperAdmin: true, userType: raw.userType ?? 'ADMIN' };
      try {
        localStorage.setItem('adminUser', JSON.stringify(updated));
      } catch {
        /* ignore */
      }
      setSession(updated);
      return;
    }
    setSession(raw);
  }, []);

  const isStaff = isStaffPanelSession(session);
  const canManageStaff = canManageStaffAccounts(session);

  return {
    session,
    isStaff,
    staffKind: session?.staffKind,
    isSuperAdmin: canManageStaff,
    canManageStaff,
  };
}
