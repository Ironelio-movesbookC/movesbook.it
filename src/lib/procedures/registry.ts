/**
 * Procedure registry — add a new procedure type here, then follow the checklist:
 * 1. Add code to PROCEDURE_TYPE_CODES (types.ts)
 * 2. Add ProcedureDefinition below and to PROCEDURE_DEFINITIONS
 * 3. Run prisma/seed-procedure-types.ts (npm run db:seed-procedures)
 * 4. Add Zod validator in validators/{code}.ts and wire validators/index.ts
 * 5. Add fetch{Type}FormOptions in lib/procedures/ and form-options route
 * 6. Build unique form component in components/club/{area}/
 * 7. Add thin pages: form + 4 archives + payment detail (reuse archives/* components)
 * 8. Add sidebar links in DarkSidebar.tsx
 */
import type { ProcedureTypeCode } from './types';
import { PROCEDURE_TYPE_CODES } from './types';

/** Standard archive tab ids — reuse for every procedure. */
export type ProcedureArchiveTabId = 'records' | 'deadlines' | 'payments' | 'receipts';

export type ProcedureMetadataKeys = {
  /** Shown in the primary detail column (e.g. service name, expense name). */
  primary: string;
  /** Optional second column (e.g. sector / section). */
  secondary?: string;
};

export type ProcedureDefinition = {
  code: ProcedureTypeCode;
  name: string;
  typologyLabel: string;
  pageSize: number;
  metadataKeys: ProcedureMetadataKeys;
  columnHeaders: {
    primary: string;
    secondary?: string;
  };
  routes: {
    form: string;
    records: string;
    deadlines: string;
    payments: string;
    receipts: string;
    paymentDetail: (recordId: string) => string;
  };
  archiveTitles: {
    records: string;
    deadlines: string;
    payments: string;
    receipts: string;
    paymentForm: string;
    newRecordButton: string;
  };
  form: {
    title: string;
    subtitle: string;
  };
};

const SERVICE_SALE: ProcedureDefinition = {
  code: PROCEDURE_TYPE_CODES.SERVICE_SALE,
  name: 'Service Sale',
  typologyLabel: 'SERVICES',
  pageSize: 25,
  metadataKeys: { primary: 'serviceName', secondary: 'sectorName' },
  columnHeaders: { primary: 'Service slot', secondary: 'Section' },
  routes: {
    form: '/clubs/new_moment_cash',
    records: '/clubs/archive_service_list',
    deadlines: '/clubs/dead_line',
    payments: '/clubs/service_payments',
    receipts: '/clubs/service_receipts',
    paymentDetail: (id) => `/clubs/payment_detail/${id}`,
  },
  archiveTitles: {
    records: 'Archive of Services',
    deadlines: 'Archive of Deadlines (Services)',
    payments: 'Archive of Payments (Services)',
    receipts: 'Archive of Receipts (Services)',
    paymentForm: 'Payment — Deadline',
    newRecordButton: '+ New service',
  },
  form: {
    title: 'Services for the customers',
    subtitle: 'Register a service sale and optionally record a payment in the same form.',
  },
};

const EXPENSE: ProcedureDefinition = {
  code: PROCEDURE_TYPE_CODES.EXPENSE,
  name: 'Member Expense',
  typologyLabel: 'EXPENSES',
  pageSize: 25,
  metadataKeys: { primary: 'expenseName' },
  columnHeaders: { primary: 'Expense' },
  routes: {
    form: '/clubs/new_expense',
    records: '/clubs/archive_expense_list',
    deadlines: '/clubs/expense_dead_line',
    payments: '/clubs/expense_payments',
    receipts: '/clubs/expense_receipts',
    paymentDetail: (id) => `/clubs/expense_payment_detail/${id}`,
  },
  archiveTitles: {
    records: 'Archive of Expenses',
    deadlines: 'Expense Deadlines',
    payments: 'Expense Payments',
    receipts: 'Expense Receipts',
    paymentForm: 'Payment — Expense',
    newRecordButton: '+ New expense',
  },
  form: {
    title: 'Member expenses',
    subtitle: 'Record a member expense and optionally pay part of it now.',
  },
};

const PRODUCT_SALE: ProcedureDefinition = {
  code: PROCEDURE_TYPE_CODES.PRODUCT_SALE,
  name: 'Product Sale',
  typologyLabel: 'SELLINGS',
  pageSize: 25,
  metadataKeys: { primary: 'productName', secondary: 'sectorName' },
  columnHeaders: { primary: 'Product', secondary: 'Sector' },
  routes: {
    form: '/ArchiveSeles/new_product_sale',
    records: '/ArchiveSeles/product_sale_list',
    deadlines: '/ArchiveSeles/product_deadline',
    payments: '/ArchiveSeles/product_payments',
    receipts: '/ArchiveSeles/product_receipts',
    paymentDetail: (id) => `/ArchiveSeles/payment_detail/${id}`,
  },
  archiveTitles: {
    records: 'Archive of Product Sales',
    deadlines: 'Product Deadlines',
    payments: 'Product Payments',
    receipts: 'Product Receipts',
    paymentForm: 'Payment — Product',
    newRecordButton: '+ New product sale',
  },
  form: {
    title: 'Shop / Selling of products',
    subtitle: 'Register a product sale and optionally record a payment.',
  },
};

const MEMBER_DEBT: ProcedureDefinition = {
  code: PROCEDURE_TYPE_CODES.MEMBER_DEBT,
  name: 'Member Debt',
  typologyLabel: 'MEMBER DEBTS',
  pageSize: 25,
  metadataKeys: { primary: 'debtLabel', secondary: 'typologyName' },
  columnHeaders: { primary: 'Debt', secondary: 'Typology' },
  routes: {
    form: '/clubMembers/debt_member',
    records: '/clubMembers/debt_member_list',
    deadlines: '/clubs/member_debt_dead_line',
    payments: '/clubs/member_debt_payments',
    receipts: '/clubs/member_debt_receipts',
    paymentDetail: (id) => `/clubs/member_debt_payment_detail/${id}`,
  },
  archiveTitles: {
    records: 'Archive of Member Debts',
    deadlines: 'Archive of Deadlines',
    payments: 'Archive of Payments',
    receipts: 'Archive of Receipts',
    paymentForm: 'Payment — Member Debt',
    newRecordButton: '+ New debit',
  },
  form: {
    title: 'Add a credit',
    subtitle: "How you can add a debt beside the 'classic' debts of subscription and purchasest",
  },
};

export const PROCEDURE_DEFINITIONS: Record<ProcedureTypeCode, ProcedureDefinition> = {
  [PROCEDURE_TYPE_CODES.SERVICE_SALE]: SERVICE_SALE,
  [PROCEDURE_TYPE_CODES.EXPENSE]: EXPENSE,
  [PROCEDURE_TYPE_CODES.PRODUCT_SALE]: PRODUCT_SALE,
  [PROCEDURE_TYPE_CODES.MEMBER_DEBT]: MEMBER_DEBT,
};

export const ALL_PROCEDURE_CODES = Object.values(PROCEDURE_TYPE_CODES);

export function getProcedureDefinition(code: string): ProcedureDefinition | null {
  if (code in PROCEDURE_DEFINITIONS) {
    return PROCEDURE_DEFINITIONS[code as ProcedureTypeCode];
  }
  return null;
}

export function getProcedureTypology(code: string): string {
  return getProcedureDefinition(code)?.typologyLabel ?? 'PROCEDURE';
}

export type ProcedureTab = {
  id: ProcedureArchiveTabId;
  label: string;
  href: string;
};

const TAB_LABELS: Record<ProcedureArchiveTabId, string> = {
  records: 'Historical',
  deadlines: 'Archive of Deadlines',
  payments: 'Payments',
  receipts: 'Receipts',
};

/** Build the four archive tabs for any registered procedure. */
export function getProcedureTabs(
  code: ProcedureTypeCode,
  active: ProcedureArchiveTabId,
  selectedRecordId?: string | null,
  /** Member of the selected row — scopes the Payments/Receipts tabs to "this member" by default. */
  selectedMemberId?: string | null
): ProcedureTab[] {
  const def = PROCEDURE_DEFINITIONS[code];
  // For service sales, Deadlines always lists SERVICES deadlines (payment form is separate).
  const deadlineHref =
    code === PROCEDURE_TYPE_CODES.SERVICE_SALE
      ? def.routes.deadlines
      : selectedRecordId
        ? def.routes.paymentDetail(selectedRecordId)
        : def.routes.deadlines;
  const memberQuery = selectedMemberId ? `?memberId=${encodeURIComponent(selectedMemberId)}` : '';
  const paymentsHref = `${def.routes.payments}${memberQuery}`;
  const receiptsHref = `${def.routes.receipts}${memberQuery}`;

  return (['records', 'deadlines', 'payments', 'receipts'] as const).map((tabId) => ({
    id: tabId,
    label: TAB_LABELS[tabId],
    href:
      tabId === 'records'
        ? def.routes.records
        : tabId === 'deadlines'
          ? deadlineHref
          : tabId === 'payments'
            ? paymentsHref
            : receiptsHref,
  }));
}
