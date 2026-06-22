'use client';

import ProcedureRecordsArchive from '@/components/procedures/archives/ProcedureRecordsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function ArchiveExpenseListPage() {
  return <ProcedureRecordsArchive procedureCode={PROCEDURE_TYPE_CODES.EXPENSE} activeTab="records" />;
}
