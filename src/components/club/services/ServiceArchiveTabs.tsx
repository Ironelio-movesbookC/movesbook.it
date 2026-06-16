'use client';

import Link from 'next/link';

type Tab = 'historical' | 'deadline' | 'payments' | 'receipts';

type Props = {
  active: Tab;
  selectedPurchaseId?: string | null;
};

export default function ServiceArchiveTabs({ active, selectedPurchaseId }: Props) {
  const deadlineHref = selectedPurchaseId
    ? `/clubs/payment_detail/${selectedPurchaseId}`
    : '/clubs/dead_line';
  const paymentsHref = selectedPurchaseId
    ? `/clubs/user_payment_list/${selectedPurchaseId}`
    : '/clubs/service_payments';

  const tabClass = (tab: Tab) =>
    `px-4 py-2 text-sm font-medium rounded-t border-b-2 ${
      active === tab
        ? 'border-teal-600 text-teal-700 bg-white'
        : 'border-transparent text-gray-600 hover:text-teal-600'
    }`;

  return (
    <div className="border-b border-gray-200 mb-4">
      <nav className="flex flex-wrap gap-1">
        <Link href="/clubs/archive_service_list" className={tabClass('historical')}>
          Historical
        </Link>
        <Link href={deadlineHref} className={tabClass('deadline')}>
          Deadline
        </Link>
        <Link href={paymentsHref} className={tabClass('payments')}>
          Payments
        </Link>
        <Link href="/clubs/service_receipts" className={tabClass('receipts')}>
          Receipts
        </Link>
      </nav>
    </div>
  );
}
