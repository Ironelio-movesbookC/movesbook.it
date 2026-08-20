'use client';

import ProcedurePaymentsArchive from '@/components/procedures/archives/ProcedurePaymentsArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function CoursePaymentsPage() {
  return <ProcedurePaymentsArchive procedureCode={PROCEDURE_TYPE_CODES.COURSE_SUBSCRIPTION} activeTab="payments" />;
}
