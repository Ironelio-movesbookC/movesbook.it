import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { decimalToNumber } from './types';

export type InstallmentDto = {
  id: string;
  procedureRecordId: string;
  paid: number;
  balance: number;
  paymentDate: string;
  expireDate: string | null;
  description: string | null;
};

function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}

function mapRow(row: {
  id: string;
  procedureRecordId: string;
  paid: unknown;
  balance: unknown;
  paymentDate: Date;
  expireDate: Date | null;
  description: string | null;
}): InstallmentDto {
  return {
    id: row.id,
    procedureRecordId: row.procedureRecordId,
    paid: decimalToNumber(row.paid as never),
    balance: decimalToNumber(row.balance as never),
    paymentDate: row.paymentDate.toISOString().slice(0, 10),
    expireDate: row.expireDate ? row.expireDate.toISOString().slice(0, 10) : null,
    description: row.description,
  };
}

export async function listInstallments(recordId: string): Promise<InstallmentDto[]> {
  const rows = await prisma.procedureInstallment.findMany({
    where: { procedureRecordId: recordId },
    orderBy: { paymentDate: 'desc' },
  });
  return rows.map(mapRow);
}

export async function createInstallment(
  input: {
    procedureRecordId: string;
    balance: number;
    paid?: number;
    paymentDate: string;
    expireDate?: string | null;
    description?: string | null;
  },
  tx?: Prisma.TransactionClient
): Promise<InstallmentDto> {
  const client = tx ?? prisma;
  const row = await client.procedureInstallment.create({
    data: {
      procedureRecordId: input.procedureRecordId,
      balance: input.balance,
      paid: input.paid ?? 0,
      paymentDate: toDateOnly(input.paymentDate),
      expireDate: input.expireDate ? toDateOnly(input.expireDate) : null,
      description: input.description ?? null,
    },
  });
  return mapRow(row);
}

export async function updateInstallment(
  id: string,
  recordId: string,
  input: Partial<{
    balance: number;
    paid: number;
    paymentDate: string;
    expireDate: string | null;
    description: string | null;
  }>
): Promise<InstallmentDto | null> {
  const existing = await prisma.procedureInstallment.findFirst({
    where: { id, procedureRecordId: recordId },
  });
  if (!existing) return null;

  const row = await prisma.procedureInstallment.update({
    where: { id },
    data: {
      ...(input.balance != null ? { balance: input.balance } : {}),
      ...(input.paid != null ? { paid: input.paid } : {}),
      ...(input.paymentDate ? { paymentDate: toDateOnly(input.paymentDate) } : {}),
      ...(input.expireDate !== undefined
        ? { expireDate: input.expireDate ? toDateOnly(input.expireDate) : null }
        : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
    },
  });
  return mapRow(row);
}

export async function deleteInstallment(id: string, recordId: string): Promise<boolean> {
  const result = await prisma.procedureInstallment.deleteMany({
    where: { id, procedureRecordId: recordId },
  });
  return result.count > 0;
}

/** Ensure at least one installment exists for a record (mirrors PHP ServicePurchasesDetail on create). */
export async function ensureDefaultInstallment(
  recordId: string,
  total: number,
  paid: number,
  paymentDate: string,
  expireDate?: string | null,
  description?: string | null,
  tx?: Prisma.TransactionClient
): Promise<void> {
  const client = tx ?? prisma;
  const count = await client.procedureInstallment.count({ where: { procedureRecordId: recordId } });
  if (count > 0) return;
  await createInstallment({
    procedureRecordId: recordId,
    balance: Math.max(0, total - paid),
    paid,
    paymentDate,
    expireDate: expireDate ?? paymentDate,
    description,
  }, tx);
}
