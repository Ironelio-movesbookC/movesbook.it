'use client';

import { clubApiFetch } from '@/lib/club/servicePurchasesClient';
import type { Member } from '@/types/clubTable';

export type ArchiveListResult = {
  items: Member[];
  total: number;
  page: number;
  pageSize: number;
};

export type ArchiveType =
  | 'members'
  | 'operators'
  | 'affiliations'
  | 'subscriptions'
  | 'product-sales'
  | 'credits'
  | 'cash-movements'
  | 'accesses'
  | 'reservations'
  | 'cards-assignments'
  | 'events'
  | 'polls'
  | 'marketing-contacts'
  | 'alerts-assigned'
  | 'advertising-campaigns'
  | 'staff-queries';

export type ArchiveFetchParams = {
  page?: number;
  pageSize?: number;
  direction?: 'all' | 'IN' | 'OUT';
  search?: string;
  fromDate?: string;
  toDate?: string;
  orderBy?: 'recent' | 'old';
};

export async function fetchClubArchive(
  type: ArchiveType,
  params?: ArchiveFetchParams
): Promise<ArchiveListResult> {
  const qs = new URLSearchParams();
  if (params?.page) qs.set('page', String(params.page));
  if (params?.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params?.direction) qs.set('direction', params.direction);
  if (params?.search) qs.set('search', params.search);
  if (params?.fromDate) qs.set('fromDate', params.fromDate);
  if (params?.toDate) qs.set('toDate', params.toDate);
  if (params?.orderBy) qs.set('orderBy', params.orderBy);
  const query = qs.toString();
  const url = `/api/club/archives/${type}${query ? `?${query}` : ''}`;
  return clubApiFetch<ArchiveListResult>(url);
}

export async function fetchCompanies(): Promise<{ id: string; name: string }[]> {
  const res = await clubApiFetch<{ companies: { id: string; name: string }[] }>('/api/club/companies');
  return res.companies;
}

export type InstallmentRow = {
  id: string;
  procedureRecordId: string;
  paid: number;
  balance: number;
  paymentDate: string;
  expireDate: string | null;
  description: string | null;
};

const BASE = '/api/club/procedures';

export async function fetchInstallments(
  procedureType: string,
  recordId: string
): Promise<InstallmentRow[]> {
  const res = await clubApiFetch<{ items: InstallmentRow[] }>(
    `${BASE}/${procedureType}/records/${recordId}/installments`
  );
  return res.items;
}

export async function createInstallment(
  procedureType: string,
  recordId: string,
  body: {
    balance: number;
    paid?: number;
    paymentDate: string;
    expireDate?: string | null;
    description?: string | null;
  }
): Promise<InstallmentRow> {
  const res = await clubApiFetch<{ installment: InstallmentRow }>(
    `${BASE}/${procedureType}/records/${recordId}/installments`,
    { method: 'POST', body: JSON.stringify(body) }
  );
  return res.installment;
}

export async function updateInstallment(
  procedureType: string,
  recordId: string,
  installmentId: string,
  body: Partial<{
    balance: number;
    paid: number;
    paymentDate: string;
    expireDate: string | null;
    description: string | null;
  }>
): Promise<InstallmentRow> {
  const res = await clubApiFetch<{ installment: InstallmentRow }>(
    `${BASE}/${procedureType}/records/${recordId}/installments?id=${encodeURIComponent(installmentId)}`,
    { method: 'PUT', body: JSON.stringify(body) }
  );
  return res.installment;
}

export async function deleteInstallment(
  procedureType: string,
  recordId: string,
  installmentId: string
): Promise<void> {
  await clubApiFetch(
    `${BASE}/${procedureType}/records/${recordId}/installments?id=${encodeURIComponent(installmentId)}`,
    { method: 'DELETE' }
  );
}
