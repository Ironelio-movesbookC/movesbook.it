'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getEntityDirectAccessLock,
  getEntityDirectAccessProfilePath,
} from '@/lib/entity/entityDirectAccessSession';
import {
  isMyPageBlockedForEntityKind,
  isWrongEntityProfilePath,
  type EntityDirectAccessKind,
} from '@/lib/entity/entityDirectAccessMeta';
import { isLegacyEntityProfilePath } from '@/lib/entity/entityWorkspaceDashboard';

/**
 * When logged in via entity username + Direct Access, block My Page routes
 * (including pasted URLs) and keep the user on that entity's profile.
 */
export function useEntityDirectAccessGuard(enabled = true) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!enabled || !pathname) return;
    const lock = getEntityDirectAccessLock();
    if (!lock) return;

    const target = getEntityDirectAccessProfilePath(lock);
    const search = typeof window !== 'undefined' ? window.location.search : '';

    if (isMyPageBlockedForEntityKind(pathname, lock.kind)) {
      router.replace(target);
      return;
    }

    if (isLegacyEntityProfilePath(lock.kind, pathname)) {
      router.replace(target);
      return;
    }

    if (isWrongEntityProfilePath(pathname, search, lock.kind, lock.entityId)) {
      router.replace(target);
    }
  }, [enabled, pathname, router]);
}

export function useEntityDirectAccessLocked(): boolean {
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    setLocked(getEntityDirectAccessLock() !== null);
  }, [pathname]);

  return locked;
}

/** Lock state for a specific entity dashboard (team / group / coach / club). */
export function useEntityDirectAccessLockedForKind(
  kind: EntityDirectAccessKind,
): boolean {
  const pathname = usePathname();
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const lock = getEntityDirectAccessLock();
    setLocked(lock?.kind === kind);
  }, [pathname, kind]);

  return locked;
}
