'use client';

import ProcedureRecordsArchive from '@/components/procedures/archives/ProcedureRecordsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function ProductRecordsArchivePage() {
  return <ProcedureRecordsArchive procedureCode={PROCEDURE_TYPE_CODES.PRODUCT_SALE} activeTab="records" />;
}
