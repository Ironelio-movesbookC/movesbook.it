'use client';

import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { OperatorNavBarWithSession } from '@/components/operators/OperatorNavBarWithSession';
import {
  operatorsRouteHasSubNav,
  parseOperatorSubNavFromPath,
  resolveOperatorNavVariant,
} from '@/lib/operatorSubNav';

/** Persistent sub-tab bar for operator detail routes (rendered from layout). */
export function OperatorSubNavFromPath() {
  const pathname = usePathname();
  const parsed = useMemo(() => parseOperatorSubNavFromPath(pathname), [pathname]);
  const variant = useMemo(() => resolveOperatorNavVariant(pathname), [pathname]);

  if (!operatorsRouteHasSubNav(pathname) || !parsed) {
    return null;
  }

  return (
    <OperatorNavBarWithSession
      operatorId={parsed.operatorId}
      activeTabId={parsed.activeTabId}
      variant={variant}
    />
  );
}
