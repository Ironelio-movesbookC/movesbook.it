import { Prisma, ProcedureRecordStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { paginated, parsePagination } from './pagination';
import type {
  AddProcedurePaymentInput,
  ClubAuthContext,
  CreateProcedureRecordInput,
  ListQuery,
  ProcedurePaymentDto,
  ProcedureReceiptDto,
  ProcedureRecordDto,
} from './types';
import { decimalToNumber } from './types';

function formatUserName(user: {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
}): string {
  return [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;
}

function toDateOnly(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
}


function buildPaymentCreateData(data: {
  procedureRecordId: string;
  amount: number;
  balanceAfter: number;
  paymentDate: Date;
  operatorId: string;
  payMode: string | null;
  notes: string | null;
}): Prisma.ProcedurePaymentUncheckedCreateInput {
  return data as Prisma.ProcedurePaymentUncheckedCreateInput;
}

function readBalanceAfter(payment: unknown): number | null {
  const value = (payment as { balanceAfter?: Prisma.Decimal | null }).balanceAfter;
  return value != null ? decimalToNumber(value) : null;
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function metaString(metadata: Record<string, unknown> | null | undefined, key: string): string {
  const value = metadata?.[key];
  return value != null ? String(value).trim() : '';
}

async function loadUserNames(ids: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, surname: true, name: true, username: true },
  });
  return new Map(users.map((u) => [u.id, formatUserName(u)]));
}

export class ProcedureService {
  async getProcedureTypeByCode(code: string) {
    return prisma.procedureType.findFirst({ where: { code, isActive: true } });
  }

  async createRecord(
    ctx: ClubAuthContext,
    procedureTypeCode: string,
    input: CreateProcedureRecordInput
  ) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const totalAmount = roundMoney(input.totalAmount);
    const initialPayment = roundMoney(input.initialPayment ?? 0);
    if (initialPayment > totalAmount) throw new Error('Initial payment exceeds total amount');

    const balanceAmount = roundMoney(totalAmount - initialPayment);
    const operatorId = input.operatorId ?? ctx.userId;
    const recordDate = toDateOnly(input.recordDate);
    const dueDate = input.dueDate ? toDateOnly(input.dueDate) : null;

    return prisma.$transaction(async (tx) => {
      const record = await tx.procedureRecord.create({
        data: {
          procedureTypeId: procedureType.id,
          clubId: ctx.club.id,
          memberId: input.memberId,
          operatorId,
          totalAmount,
          paidAmount: initialPayment,
          balanceAmount,
          recordDate,
          dueDate,
          notes: input.notes ?? null,
          metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
          status: ProcedureRecordStatus.ACTIVE,
        },
      });

      let paymentId: string | null = null;
      if (initialPayment > 0) {
        const payment = await tx.procedurePayment.create({
          data: buildPaymentCreateData({
            procedureRecordId: record.id,
            amount: initialPayment,
            balanceAfter: balanceAmount,
            paymentDate: recordDate,
            operatorId,
            payMode: input.payMode ?? null,
            notes: input.notes ?? null,
          }),
        });
        paymentId = payment.id;
      }

      let receiptId: string | null = null;
      if (input.createReceipt && initialPayment > 0) {
        const receipt = await tx.procedureReceipt.create({
          data: {
            procedureRecordId: record.id,
            procedurePaymentId: paymentId,
            clubId: ctx.club.id,
            memberId: input.memberId,
            operatorId,
            documentType: input.receiptDocumentType ?? 'Invoice',
            documentNumber:
              input.receiptNumber ?? `${recordDate.getUTCFullYear()}-${String(record.id).slice(-6)}`,
            amount: totalAmount,
            paymentAmount: initialPayment,
            annotations: input.receiptAnnotations ?? input.notes ?? null,
            serviceName: input.serviceName ?? null,
            receiptDate: recordDate,
          },
        });
        receiptId = receipt.id;
      }

      return { recordId: record.id, paymentId, receiptId };
    });
  }

  async addPayment(
    ctx: ClubAuthContext,
    procedureTypeCode: string,
    recordId: string,
    input: AddProcedurePaymentInput
  ) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const amount = roundMoney(input.amount);
    if (amount <= 0) throw new Error('Payment amount must be greater than 0');

    const record = await prisma.procedureRecord.findFirst({
      where: {
        id: recordId,
        clubId: ctx.club.id,
        procedureTypeId: procedureType.id,
        status: ProcedureRecordStatus.ACTIVE,
      },
    });
    if (!record) throw new Error('Record not found');

    const currentBalance = decimalToNumber(record.balanceAmount);
    if (amount > currentBalance) throw new Error('Payment exceeds remaining balance');

    const operatorId = input.operatorId ?? ctx.userId;
    const paymentDate = toDateOnly(input.paymentDate);
    const newPaid = roundMoney(decimalToNumber(record.paidAmount) + amount);
    const newBalance = roundMoney(currentBalance - amount);

    return prisma.$transaction(async (tx) => {
      const payment = await tx.procedurePayment.create({
        data: buildPaymentCreateData({
          procedureRecordId: record.id,
          amount,
          balanceAfter: newBalance,
          paymentDate,
          operatorId,
          payMode: input.payMode ?? null,
          notes: input.notes ?? null,
        }),
      });

      await tx.procedureRecord.update({
        where: { id: record.id },
        data: { paidAmount: newPaid, balanceAmount: newBalance, operatorId },
      });

      let receiptId: string | null = null;
      if (input.createReceipt) {
        const receipt = await tx.procedureReceipt.create({
          data: {
            procedureRecordId: record.id,
            procedurePaymentId: payment.id,
            clubId: ctx.club.id,
            memberId: record.memberId,
            operatorId,
            documentType: input.receiptDocumentType ?? 'Invoice',
            documentNumber:
              input.receiptNumber ?? `${paymentDate.getUTCFullYear()}-${String(payment.id).slice(-6)}`,
            amount: decimalToNumber(record.totalAmount),
            paymentAmount: amount,
            annotations: input.receiptAnnotations ?? input.notes ?? null,
            serviceName: input.serviceName ?? null,
            receiptDate: paymentDate,
          },
        });
        receiptId = receipt.id;
      }

      return { paymentId: payment.id, receiptId, balanceAmount: newBalance };
    });
  }

  async softDeleteRecord(ctx: ClubAuthContext, procedureTypeCode: string, recordId: string) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const result = await prisma.procedureRecord.updateMany({
      where: {
        id: recordId,
        clubId: ctx.club.id,
        procedureTypeId: procedureType.id,
        status: ProcedureRecordStatus.ACTIVE,
      },
      data: { status: ProcedureRecordStatus.DELETED },
    });
    if (result.count === 0) throw new Error('Record not found');
  }

  async listRecords(
    ctx: ClubAuthContext,
    procedureTypeCode: string,
    query: ListQuery,
    options: { onlyWithBalance?: boolean } = {}
  ) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const { page, pageSize, skip } = parsePagination(query);
    const where: Prisma.ProcedureRecordWhereInput = {
      clubId: ctx.club.id,
      procedureTypeId: procedureType.id,
      status: ProcedureRecordStatus.ACTIVE,
      ...(query.memberId ? { memberId: query.memberId } : {}),
      ...(query.recordId ? { id: query.recordId } : {}),
      ...(options.onlyWithBalance ? { balanceAmount: { gt: 0 } } : {}),
    };

    const [total, rows] = await Promise.all([
      prisma.procedureRecord.count({ where }),
      prisma.procedureRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          payments: { select: { paymentDate: true }, orderBy: { paymentDate: 'desc' }, take: 1 },
        },
      }),
    ]);

    const nameById = await loadUserNames(
      rows.flatMap((r) => [r.memberId, r.operatorId].filter(Boolean) as string[])
    );

    const items: ProcedureRecordDto[] = rows.map((row) => ({
      id: row.id,
      procedureTypeCode,
      clubId: row.clubId,
      memberId: row.memberId,
      memberName: nameById.get(row.memberId) ?? row.memberId,
      operatorId: row.operatorId,
      operatorName: row.operatorId ? nameById.get(row.operatorId) ?? '-' : '-',
      totalAmount: decimalToNumber(row.totalAmount),
      paidAmount: decimalToNumber(row.paidAmount),
      balanceAmount: decimalToNumber(row.balanceAmount),
      recordDate: row.recordDate.toISOString().slice(0, 10),
      dueDate: row.dueDate ? row.dueDate.toISOString().slice(0, 10) : null,
      notes: row.notes,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      lastPaymentDate: row.payments[0]?.paymentDate.toISOString().slice(0, 10) ?? null,
    }));

    return paginated(items, total, page, pageSize);
  }

  async listPayments(ctx: ClubAuthContext, procedureTypeCode: string, query: ListQuery) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const { page, pageSize, skip } = parsePagination(query);
    const where: Prisma.ProcedurePaymentWhereInput = {
      procedureRecord: {
        clubId: ctx.club.id,
        procedureTypeId: procedureType.id,
        status: ProcedureRecordStatus.ACTIVE,
        ...(query.recordId ? { id: query.recordId } : {}),
      },
    };

    const [total, rows] = await Promise.all([
      prisma.procedurePayment.count({ where }),
      prisma.procedurePayment.findMany({
        where,
        orderBy: { paymentDate: 'desc' },
        skip,
        take: pageSize,
        include: { procedureRecord: { select: { memberId: true, metadata: true } } },
      }),
    ]);

    const nameById = await loadUserNames(
      rows.flatMap((r) => [r.procedureRecord.memberId, r.operatorId].filter(Boolean) as string[])
    );

    const items: ProcedurePaymentDto[] = rows.map((row) => {
      const metadata = (row.procedureRecord.metadata as Record<string, unknown> | null) ?? null;
      return {
        id: row.id,
        procedureRecordId: row.procedureRecordId,
        memberName: nameById.get(row.procedureRecord.memberId) ?? row.procedureRecord.memberId,
        amount: decimalToNumber(row.amount),
        paymentDate: row.paymentDate.toISOString().slice(0, 10),
        operatorId: row.operatorId,
        operatorName: row.operatorId ? nameById.get(row.operatorId) ?? '-' : '-',
        payMode: row.payMode,
        notes: row.notes,
        serviceName: metaString(metadata, 'serviceName') || null,
        typology: 'SERVICES',
        balanceAfter: readBalanceAfter(row),
      };
    });

    return paginated(items, total, page, pageSize);
  }

  async listReceipts(ctx: ClubAuthContext, procedureTypeCode: string, query: ListQuery) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const { page, pageSize, skip } = parsePagination(query);
    const where: Prisma.ProcedureReceiptWhereInput = {
      clubId: ctx.club.id,
      procedureRecord: {
        procedureTypeId: procedureType.id,
        status: ProcedureRecordStatus.ACTIVE,
        ...(query.recordId ? { id: query.recordId } : {}),
      },
    };

    const [total, rows] = await Promise.all([
      prisma.procedureReceipt.count({ where }),
      prisma.procedureReceipt.findMany({
        where,
        orderBy: { receiptDate: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    const nameById = await loadUserNames(
      rows.flatMap((r) => [r.memberId, r.operatorId].filter(Boolean) as string[])
    );

    const items: ProcedureReceiptDto[] = rows.map((row) => ({
      id: row.id,
      procedureRecordId: row.procedureRecordId,
      procedurePaymentId: row.procedurePaymentId,
      memberName: nameById.get(row.memberId) ?? row.memberId,
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      amount: decimalToNumber(row.amount),
      paymentAmount: decimalToNumber(row.paymentAmount),
      serviceName: row.serviceName,
      receiptDate: row.receiptDate.toISOString().slice(0, 10),
      annotations: row.annotations,
      typology: 'SERVICES',
      operatorName: row.operatorId ? nameById.get(row.operatorId) ?? '-' : '-',
    }));

    return paginated(items, total, page, pageSize);
  }
}

export const procedureService = new ProcedureService();
