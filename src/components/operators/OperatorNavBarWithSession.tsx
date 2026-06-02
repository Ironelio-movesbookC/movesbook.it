'use client';

import { OperatorNavBar } from '@/components/operators/OperatorNavBar';
import { usePanelSession } from '@/hooks/usePanelSession';
import type { OperatorNavTabId, OperatorNavVariant } from '@/lib/operatorNavTabs';

type Props = {
  operatorId: string;
  activeTabId: OperatorNavTabId;
  variant: OperatorNavVariant;
};

export function OperatorNavBarWithSession({ operatorId, activeTabId, variant }: Props) {
  const { session, isStaff, staffKind, isSuperAdmin, canManageStaff } = usePanelSession();
  return (
    <OperatorNavBar
      operatorId={operatorId}
      activeTabId={activeTabId}
      variant={variant}
      isStaff={isStaff}
      staffKind={staffKind}
      isSuperAdmin={isSuperAdmin}
      canManageStaff={canManageStaff}
      sessionId={session?.id}
    />
  );
}
