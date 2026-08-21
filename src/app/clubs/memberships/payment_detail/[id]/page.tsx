'use client';

import ProcedurePaymentDetail from '@/components/procedures/archives/ProcedurePaymentDetail';
import { PROCEDURE_TYPE_CODES } from '@/lib/procedures/types';

export default function MembershipPaymentDetailPage() {
  return <ProcedurePaymentDetail procedureCode={PROCEDURE_TYPE_CODES.MEMBERSHIP} />;
}
