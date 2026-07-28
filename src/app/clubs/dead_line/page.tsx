'use client';

import ProcedureDeadlinesArchive from '@/components/procedures/archives/ProcedureDeadlinesArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function DeadLinePage() {
  return (
    <ProcedureDeadlinesArchive
      procedureCode={PROCEDURE_TYPE_CODES.SERVICE_SALE}
      activeTab="deadlines"
    />
  );
}
