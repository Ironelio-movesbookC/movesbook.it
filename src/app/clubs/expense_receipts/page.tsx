'use client';

import ProcedureReceiptsArchive from '@/components/procedures/archives/ProcedureReceiptsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function ExpenseReceiptsPage() {
  return (
    <ProcedureReceiptsArchive procedureCode={PROCEDURE_TYPE_CODES.EXPENSE} activeTab="receipts" />
  );
}
