'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OperatorNavBarWithSession } from '@/components/operators/OperatorNavBarWithSession';
import {
  operatorsRouteHasSubNav,
  parseOperatorSubNavFromPath,
  resolveOperatorNavVariant,
} from '@/lib/operatorSubNav';

/** Persistent sub-tab bar for operator detail routes (rendered from layout). */
export function OperatorSubNavFromPath() {
  const pathname = usePathname();
  const [contextVersion, setContextVersion] = useState(0);
  const parsed = useMemo(() => parseOperatorSubNavFromPath(pathname), [pathname]);
  const variant = useMemo(() => {
    void contextVersion; // re-read session after operatorNavContextUpdated
    return resolveOperatorNavVariant(pathname);
  }, [pathname, contextVersion]);

  useEffect(() => {
    const onContextUpdate = () => setContextVersion((n) => n + 1);
    window.addEventListener('operatorNavContextUpdated', onContextUpdate);
    return () => window.removeEventListener('operatorNavContextUpdated', onContextUpdate);
  }, []);

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
