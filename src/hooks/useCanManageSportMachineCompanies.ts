'use client';

import { useCallback, useEffect, useState } from 'react';
import { resolveIsSuperAdminFromStorage } from '@/lib/panelSession';

/** Super Admin (table) JWT or User ADMIN panel JWT — same rules as former Admin Management → Companies. */
export async function checkCanManageSportMachineCompanies(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem('adminToken');
  if (token) {
    try {
      const sessionRes = await fetch('/api/admin/super-admin/session', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const session = await sessionRes.json();
      if (session.tableSuperAdmin && session.superAdmin) return true;
      if (session.isAdminUser) return true;
    } catch {
      /* ignore */
    }
  }
  if (resolveIsSuperAdminFromStorage()) return true;
  return false;
}

export function useCanManageSportMachineCompanies(enabled: boolean) {
  const [canManage, setCanManage] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setCanManage(false);
      return;
    }
    setCanManage(await checkCanManageSportMachineCompanies());
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { canManage, refresh };
}
