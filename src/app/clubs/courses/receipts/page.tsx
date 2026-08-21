'use client';

import ProcedureReceiptsArchive from '@/components/procedures/archives/ProcedureReceiptsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function CourseReceiptsPage() {
  return <ProcedureReceiptsArchive procedureCode={PROCEDURE_TYPE_CODES.COURSE_SUBSCRIPTION} activeTab="receipts" />;
}
