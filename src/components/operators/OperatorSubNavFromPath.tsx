'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { OperatorNavBarWithSession } from '@/components/operators/OperatorNavBarWithSession';
import type { OperatorNavVariant } from '@/lib/operatorNavTabs';
import {
  operatorsRouteHasSubNav,
  parseOperatorSubNavFromPath,
  readOperatorNavVariantFromSession,
} from '@/lib/operatorSubNav';

/** Persistent sub-tab bar for operator detail routes (rendered from layout). */
export function OperatorSubNavFromPath() {
  const pathname = usePathname();
  const parsed = useMemo(() => parseOperatorSubNavFromPath(pathname), [pathname]);
  const [variant, setVariant] = useState<OperatorNavVariant>(
    () => parsed?.variant ?? { kind: 'standard' },
  );

  useEffect(() => {
    if (!parsed) return;
    if (parsed.variant.kind !== 'standard') {
      setVariant(parsed.variant);
      return;
    }
    setVariant(readOperatorNavVariantFromSession());
  }, [parsed]);

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
