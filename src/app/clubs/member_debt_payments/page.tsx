'use client';

import ProcedurePaymentsArchive from '@/components/procedures/archives/ProcedurePaymentsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function MemberDebtPaymentsPage() {
  return (
    <ProcedurePaymentsArchive procedureCode={PROCEDURE_TYPE_CODES.MEMBER_DEBT} activeTab="payments" />
  );
}
