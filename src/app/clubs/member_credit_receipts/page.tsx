'use client';

import ProcedureReceiptsArchive from '@/components/procedures/archives/ProcedureReceiptsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function MemberCreditReceiptsPage() {
  return (
    <ProcedureReceiptsArchive procedureCode={PROCEDURE_TYPE_CODES.MEMBER_CREDIT} activeTab="receipts" />
  );
}
