'use client';

import ServiceSalePaymentsArchive from '@/components/procedures/ServiceSalePaymentsArchive';

export default function MovementCashDetailsPage() {
  return (
    <ServiceSalePaymentsArchive
      title="Cash Movements (Service Payments)"
      footerHint="All service sale payments from the procedure engine."
      variant="all"
    />
  );
}
