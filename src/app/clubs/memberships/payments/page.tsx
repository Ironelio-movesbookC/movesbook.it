'use client';

import ProcedurePaymentsArchive from '@/components/procedures/archives/ProcedurePaymentsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function MembershipPaymentsPage() {
  return <ProcedurePaymentsArchive procedureCode={PROCEDURE_TYPE_CODES.MEMBERSHIP} activeTab="payments" />;
}
