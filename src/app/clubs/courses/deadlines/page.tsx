'use client';

import ProcedureDeadlinesArchive from '@/components/procedures/archives/ProcedureDeadlinesArchive';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function CourseDeadlinesPage() {
  return <ProcedureDeadlinesArchive procedureCode={PROCEDURE_TYPE_CODES.COURSE_SUBSCRIPTION} activeTab="deadlines" />;
}
