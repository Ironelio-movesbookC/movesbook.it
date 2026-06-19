'use client';

import ProcedureArchiveTabs from '@/components/procedures/ProcedureArchiveTabs';
import { getServiceSaleTabs, type ServiceSaleTabId } from '@/components/procedures/configs/serviceSale';

type Tab = ServiceSaleTabId;

type Props = {
  active: Tab;
  selectedPurchaseId?: string | null;
};

/** @deprecated Use ProcedureArchiveTabs with getServiceSaleTabs() from @/components/procedures */
export default function ServiceArchiveTabs({ active, selectedPurchaseId }: Props) {
  return <ProcedureArchiveTabs tabs={getServiceSaleTabs(active, selectedPurchaseId)} activeTab={active} />;
}
