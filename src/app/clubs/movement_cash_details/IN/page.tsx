'use client';

import ServiceSalePaymentsArchive from '@/components/procedures/ServiceSalePaymentsArchive';

export default function MovementCashInPage() {
  return (
    <ServiceSalePaymentsArchive
      title="Cash In (Service Payments)"
      footerHint="Member payments received via service sales."
      variant="in"
    />
  );
}
