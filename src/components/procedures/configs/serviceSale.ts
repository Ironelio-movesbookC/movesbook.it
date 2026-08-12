import type { Column } from '@/types/clubTable';
import { formatDate, formatEuro } from '@/lib/club/servicePurchasesClient';
import type { ProcedureTab } from '../types';

export type ServiceSaleTabId = 'historical' | 'deadline' | 'payments' | 'receipts';

export const SERVICE_SALE_PAGE_SIZE = 25;

export function getServiceSaleTabs(
  active: ServiceSaleTabId,
  selectedRecordId?: string | null,
  /** When set (e.g. from payment form), Historical/Payments/Receipts are scoped to these exact records. */
  scopedRecordIds?: string[] | null,
  /** Extra query suffix already including `?` (e.g. `?ids=a,b&all=1`) to preserve scope on sibling tabs. */
  scopeQuery?: string | null,
  /** Member of the row selected on Historical — scopes Deadlines/Payments/Receipts to "this member" by default. */
  selectedMemberId?: string | null
): ProcedureTab[] {
  const ids = scopedRecordIds && scopedRecordIds.length > 0 ? scopedRecordIds : [];

  const builtQuery =
    scopeQuery && scopeQuery.length > 0
      ? scopeQuery.startsWith('?')
        ? scopeQuery
        : `?${scopeQuery}`
      : ids.length > 0
        ? `?ids=${encodeURIComponent(ids.join(','))}`
        : '';

  const memberQuery = selectedMemberId ? `?memberId=${encodeURIComponent(selectedMemberId)}` : '';
  // Exact-record scope (from the payment form) wins over member scope (from a Historical row click).
  const sideQuery = builtQuery || memberQuery;

  return [
    { id: 'historical', label: 'Historical', href: `/clubs/archive_service_list${builtQuery}` },
    { id: 'deadline', label: 'Archive of Deadlines', href: `/clubs/dead_line${memberQuery}` },
    { id: 'payments', label: 'Payments', href: `/clubs/service_payments${sideQuery}` },
    { id: 'receipts', label: 'Receipts', href: `/clubs/service_receipts${sideQuery}` },
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
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'dateEnd', header: 'Last payment', render: (v) => formatDate(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
  { key: 'edit', header: 'Edit' },
  { key: 'delete', header: 'Delete' },
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
  { key: 'originalDebt', header: 'OF..', render: (_, row) => `${row.paid?.toFixed(2) ?? '0.00'} / ${row.originalDebt?.toFixed(2) ?? '0.00'}` },
  { key: 'rest', header: 'Rest', render: (v) => formatEuro(v) },
  { key: 'casual', header: 'Notes' },
  { key: 'operator', header: 'Operator' },
  { key: 'edit', header: 'Edit' },
  { key: 'delete', header: 'Delete' },
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
  { key: 'edit', header: 'Edit' },
  { key: 'delete', header: 'Delete' },
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
