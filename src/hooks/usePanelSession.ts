'use client';

import { useEffect, useState } from 'react';
import {
  canManageStaffAccounts,
  isFullAdminPanelSession,
  isStaffPanelSession,
  normalizePanelSession,
  readPanelSession,
  type PanelSessionUser,
} from '@/lib/panelSession';

export function usePanelSession() {
  const [session, setSession] = useState<PanelSessionUser | null>(() =>
    typeof window === 'undefined' ? null : normalizePanelSession(readPanelSession()),
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const normalized = normalizePanelSession(readPanelSession());
    if (normalized) {
      const raw = readPanelSession();
      if (raw && isFullAdminPanelSession(raw) && !raw.isSuperAdmin) {
        try {
          localStorage.setItem('adminUser', JSON.stringify(normalized));
        } catch {
          /* ignore */
        }
      }
    }
    setSession(normalized);
    setHydrated(true);
  }, []);

  const isStaff = isStaffPanelSession(session);
  const canManageStaff = canManageStaffAccounts(session);

  return {
    session,
    hydrated,
    isStaff,
    staffKind: session?.staffKind,
    isSuperAdmin: canManageStaff,
    canManageStaff,
  };
}
