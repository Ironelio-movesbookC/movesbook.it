import type { Column } from '@/types/clubTable';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import type { ProcedureTab } from '../types';

export type ServiceSaleTabId = 'historical' | 'deadline' | 'payments' | 'receipts';

export const SERVICE_SALE_PAGE_SIZE = 25;

export function getServiceSaleTabs(
  active: ServiceSaleTabId,
  selectedRecordId?: string | null
): ProcedureTab[] {
  const deadlineHref = selectedRecordId
    ? `/clubs/payment_detail/${selectedRecordId}`
    : '/clubs/dead_line';
  const paymentsHref = selectedRecordId
    ? `/clubs/user_payment_list/${selectedRecordId}`
    : '/clubs/service_payments';

  return [
    { id: 'historical', label: 'Historical', href: '/clubs/archive_service_list' },
    { id: 'deadline', label: 'Deadline', href: deadlineHref },
    { id: 'payments', label: 'Payments', href: paymentsHref },
    { id: 'receipts', label: 'Receipts', href: '/clubs/service_receipts' },
  ];
}

export const serviceSaleRecordColumns: Column[] = [
  { key: 'number', header: 'N' },
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'course', header: 'Section' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'value', header: 'Cost', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Paid', render: (v) => formatEuro(v) },
  { key: 'dateEnd', header: 'Last payment', render: (v) => formatDate(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
  { key: 'options', header: 'Delete' },
];

export const serviceSaleDeadlineColumns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'value', header: 'Cost', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Paid', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'dateEnd', header: 'Last payment', render: (v) => formatDate(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
];

export const serviceSalePaymentColumns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
];

export const serviceSalePaymentDetailColumns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest after', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
];

export const serviceSaleReceiptColumns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'category', header: 'Document' },
  { key: 'contract', header: 'No. of document' },
  { key: 'value', header: 'Cost', render: (v) => formatEuro(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Annotations' },
  { key: 'operator', header: 'Operator' },
];

export const serviceSaleMovementColumns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'paid', header: 'Payment IN', render: (v) => formatEuro(v) },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'payMod', header: 'Pay Mode' },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
];

export const serviceSaleCashInColumns: Column[] = [
  { key: 'name', header: 'Full Name' },
  { key: 'paid', header: 'Value In', render: (v) => formatEuro(v) },
  { key: 'insertDate', header: 'Date', render: (v) => formatDate(v) },
  { key: 'typology', header: 'Typology' },
  { key: 'service', header: 'Service slot' },
  { key: 'operator', header: 'Operator' },
  { key: 'casual', header: 'Notes' },
];
