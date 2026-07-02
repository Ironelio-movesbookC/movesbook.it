import React from 'react';
import type { Member, Column } from '@/types/clubTable';

export type { Member, Column };

export type ProcedureTab = {
  id: string;
  label: string;
  href: string;
};

export type ProcedureArchiveShellProps = {
  title: string;
  activeTab: string;
  tabs: ProcedureTab[];
  headerAction?: React.ReactNode;
  error?: string;
  footerHint?: string;
  children: React.ReactNode;
  pagination?: React.ReactNode;
};

export type PaymentFormValues = {
  amountPaid: number;
  paymentDate: string;
  notes: string;
  createReceipt: boolean;
  receiptNumber: string;
};

export type PaymentFormProps = {
  maxAmount: number;
  disabled?: boolean;
  saving?: boolean;
  error?: string;
  success?: string;
  onSubmit: (values: PaymentFormValues) => Promise<void>;
  onCancel?: () => void;
  cancelLabel?: string;
};
