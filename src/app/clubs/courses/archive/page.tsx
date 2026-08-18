'use client';

import ProcedureRecordsArchive from '@/components/procedures/archives/ProcedureRecordsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function CourseArchivePage() {
  return <ProcedureRecordsArchive procedureCode={PROCEDURE_TYPE_CODES.COURSE_SUBSCRIPTION} activeTab="records" />;
}
