import { Prisma, ProcedureRecordStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { getProcedureDefinition, getProcedureTypology } from './registry';
import { paginated, parsePagination } from './pagination';
import { verifyOperatorPassword } from './operatorAuth';
import { applyCardCreditPayment } from './insertCreditService';
import { ensureDefaultInstallment } from './installmentService';
import { PROCEDURE_TYPE_CODES } from './types';
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

function receiptMemberName(
  memberId: string,
  metadata: Record<string, unknown> | null | undefined,
  nameById: Map<string, string>
): string {
  const taxDocument = metadata?.taxDocument;
  if (taxDocument && typeof taxDocument === 'object' && !Array.isArray(taxDocument)) {
    const displayName = metaString(taxDocument as Record<string, unknown>, 'memberDisplayName');
    if (displayName) return displayName;
  }
  return nameById.get(memberId) ?? memberId;
}

async function loadUserNames(ids: string[]): Promise<Map<string, string>> {
  const profiles = await loadUserProfiles(ids);
  return new Map(Array.from(profiles.entries()).map(([id, p]) => [id, p.name]));
}

async function loadUserProfiles(
  ids: string[]
): Promise<Map<string, { name: string; image: string | null }>> {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return new Map();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, firstName: true, surname: true, name: true, username: true, image: true },
  });
  return new Map(
    users.map((u) => [
      u.id,
      {
        name: formatUserName(u),
        image: u.image?.trim() || null,
      },
    ])
  );
}

async function getLegacyUserId(userId: string): Promise<string | null> {
  const fromId = userId.match(/^legacy_(\d+)(?:_|$)/);
  if (fromId?.[1]) return fromId[1];

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id
     FROM \`${mappingTable}\`
     WHERE new_id = ?
       AND legacy_table = 'users'
     ORDER BY legacy_id DESC
     LIMIT 1`,
    userId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getOtherSetting(clubId: string, key: string, userId?: string): Promise<string> {
  const TABLE_NAME = 'club_reader_other_settings';
  const JSON_TABLE_NAME = 'club_other_settings';

  try {
    const tableName = await findExistingTable([TABLE_NAME]);
    if (tableName && userId) {
      const legacyUserId = await getLegacyUserId(userId);
      const userIds = Array.from(new Set([userId, legacyUserId].filter(Boolean) as string[]));
      const userPlaceholders = userIds.map(() => '?').join(',');

      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT \`${key}\` AS val
         FROM \`${tableName}\`
         WHERE club_user_id IN (${userPlaceholders})
           AND club_id = ?
         ORDER BY id DESC LIMIT 1`,
        ...userIds, clubId
      );
      const val = rows?.[0]?.val != null ? String(rows[0].val) : '';
      if (val) return val;
    }
  } catch {
    /* table may not exist */
  }
  try {
    const jsonTable = await findExistingTable([JSON_TABLE_NAME]);
    if (jsonTable) {
      const rows = await prisma.$queryRawUnsafe<{ settings_json: string }[]>(
        `SELECT settings_json FROM \`${jsonTable}\` ORDER BY id DESC LIMIT 1`
      );
      if (rows?.[0]?.settings_json) {
        const json = JSON.parse(rows[0].settings_json);
        const mapping: Record<string, string> = {
          operator_pass_status: 'operatorPassStatus',
          form_pay_deadline_status: 'formPayDeadlineStatus',
        };
        const jsKey = mapping[key];
        if (jsKey && json[jsKey] != null) return String(json[jsKey]);
      }
    }
  } catch {
    /* fall through */
  }
  return '';
}

function isPasswordEnabledSetting(value: string): boolean {
  const normalised = value.trim().toLowerCase();
  return normalised === 'yes' || normalised === 'y' || normalised === '1' || normalised === 't' || normalised === 'true';
}

async function assertOperatorPassword(
  procedureTypeCode: string,
  operatorId: string,
  password: string | null | undefined,
  clubId?: string,
  userId?: string
): Promise<void> {
  const requiresPassword =
    procedureTypeCode === PROCEDURE_TYPE_CODES.SERVICE_SALE ||
    procedureTypeCode === PROCEDURE_TYPE_CODES.PRODUCT_SALE ||
    procedureTypeCode === PROCEDURE_TYPE_CODES.EXPENSE;
  if (!requiresPassword) return;
  if (clubId) {
    const setting = await getOtherSetting(clubId, 'operator_pass_status', userId);
    if (!setting || !isPasswordEnabledSetting(setting)) return;
  }
  const trimmed = password?.trim();
  if (!trimmed) throw new Error('Operator password is required');
  const ok = await verifyOperatorPassword(operatorId, trimmed);
  if (!ok) throw new Error('Operator password is incorrect');
}

function mergeMetadata(
  existing: Record<string, unknown> | null | undefined,
  patch: Record<string, unknown>
): Record<string, unknown> {
  return { ...(existing ?? {}), ...patch };
}

export class ProcedureService {
  async getProcedureTypeByCode(code: string) {
    const existing = await prisma.procedureType.findFirst({ where: { code, isActive: true } });
    if (existing) return existing;

    const def = getProcedureDefinition(code);
    if (!def) return null;

    return prisma.procedureType.upsert({
      where: { code },
      update: { name: def.name, description: def.form.subtitle, isActive: true },
      create: { code, name: def.name, description: def.form.subtitle, isActive: true },
    });
  }

  async createRecord(
    ctx: ClubAuthContext,
    procedureTypeCode: string,
    input: CreateProcedureRecordInput
  ) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const deadlineStatus = await getOtherSetting(ctx.club.id, 'form_pay_deadline_status', ctx.userId);
    const skipDeadlines = deadlineStatus === 'No';

    const totalAmount = skipDeadlines ? 0 : roundMoney(input.totalAmount);
    const initialPayment = skipDeadlines ? 0 : roundMoney(input.initialPayment ?? 0);
    if (initialPayment > totalAmount) throw new Error('Initial payment exceeds total amount');

    const balanceAmount = roundMoney(totalAmount - initialPayment);
    const operatorId = input.operatorId ?? ctx.userId;
    await assertOperatorPassword(procedureTypeCode, operatorId, input.operatorPassword, ctx.club.id, ctx.userId);

    const recordDate = toDateOnly(input.recordDate);
    const paymentDate = input.paymentDate ? toDateOnly(input.paymentDate) : recordDate;
    const dueDate = input.dueDate ? toDateOnly(input.dueDate) : paymentDate;

    const metadata = mergeMetadata(input.metadata ?? null, {
      ...(input.paymentType ? { paymentType: input.paymentType } : {}),
      ...(input.taxDoc != null ? { taxDoc: input.taxDoc } : {}),
      ...(input.taxDocument ? { taxDocument: input.taxDocument } : {}),
    });

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
          metadata: metadata as Prisma.InputJsonValue,
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
            paymentDate,
            operatorId,
            payMode: input.payMode ?? null,
            notes: input.notes ?? null,
          }),
        });
        paymentId = payment.id;
      }

      let receiptId: string | null = null;
      if ((input.createReceipt || input.taxDoc) && initialPayment > 0) {
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
            receiptDate: paymentDate,
          },
        });
        receiptId = receipt.id;
      }

      if (!skipDeadlines) {
        await ensureDefaultInstallment(
          record.id,
          totalAmount,
          initialPayment,
          paymentDate.toISOString().slice(0, 10),
          dueDate?.toISOString().slice(0, 10) ?? null,
          input.notes ?? null,
          tx
        );
      }

      if (initialPayment > 0 && input.payMode === 'card') {
        await applyCardCreditPayment(ctx.club.id, input.memberId, initialPayment, operatorId);
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
    await assertOperatorPassword(procedureTypeCode, operatorId, input.operatorPassword, ctx.club.id, ctx.userId);

    const paymentDate = toDateOnly(input.paymentDate);
    const newPaid = roundMoney(decimalToNumber(record.paidAmount) + amount);
    const newBalance = roundMoney(currentBalance - amount);

    const existingMetadata = (record.metadata as Record<string, unknown> | null) ?? null;
    const metadata = mergeMetadata(existingMetadata, {
      ...(input.paymentType ? { paymentType: input.paymentType } : {}),
      ...(input.taxDoc != null ? { taxDoc: input.taxDoc } : {}),
      ...(input.taxDocument ? { taxDocument: input.taxDocument } : {}),
    });

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
        data: {
          paidAmount: newPaid,
          balanceAmount: newBalance,
          operatorId,
          notes: input.notes ?? record.notes,
          dueDate: input.debtExpire ? toDateOnly(input.debtExpire) : record.dueDate,
          metadata: metadata as Prisma.InputJsonValue,
        },
      });

      let receiptId: string | null = null;
      if (input.createReceipt || input.taxDoc) {
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

      if (input.payMode === 'card') {
        await applyCardCreditPayment(ctx.club.id, record.memberId, amount, operatorId);
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

  async updateRecord(
    ctx: ClubAuthContext,
    procedureTypeCode: string,
    recordId: string,
    input: { recordDate?: string; notes?: string; operatorId?: string; totalAmount?: number }
  ) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const record = await prisma.procedureRecord.findFirst({
      where: {
        id: recordId,
        clubId: ctx.club.id,
        procedureTypeId: procedureType.id,
        status: ProcedureRecordStatus.ACTIVE,
      },
    });
    if (!record) throw new Error('Record not found');

    const data: Record<string, unknown> = {};
    if (input.recordDate) data.recordDate = toDateOnly(input.recordDate);
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.operatorId) data.operatorId = input.operatorId;
    if (input.totalAmount !== undefined) {
      const diff = input.totalAmount - decimalToNumber(record.totalAmount);
      data.totalAmount = input.totalAmount;
      data.balanceAmount = decimalToNumber(record.balanceAmount) + diff;
    }

    await prisma.procedureRecord.update({
      where: { id: recordId },
      data: data as Prisma.ProcedureRecordUpdateInput,
    });

    return { success: true };
  }

  async updatePayment(
    ctx: ClubAuthContext,
    procedureTypeCode: string,
    paymentId: string,
    input: { paymentDate?: string; notes?: string; operatorId?: string }
  ) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const payment = await prisma.procedurePayment.findFirst({
      where: { id: paymentId },
      include: { procedureRecord: { select: { procedureTypeId: true, clubId: true } } },
    });
    if (!payment || payment.procedureRecord.clubId !== ctx.club.id || payment.procedureRecord.procedureTypeId !== procedureType.id) {
      throw new Error('Payment not found');
    }

    const data: Record<string, unknown> = {};
    if (input.paymentDate) data.paymentDate = toDateOnly(input.paymentDate);
    if (input.notes !== undefined) data.notes = input.notes;
    if (input.operatorId) data.operatorId = input.operatorId;

    await prisma.procedurePayment.update({
      where: { id: paymentId },
      data: data as Prisma.ProcedurePaymentUpdateInput,
    });

    return { success: true };
  }

  async deletePayment(ctx: ClubAuthContext, procedureTypeCode: string, paymentId: string) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const payment = await prisma.procedurePayment.findFirst({
      where: { id: paymentId },
      include: { procedureRecord: { select: { procedureTypeId: true, clubId: true } } },
    });
    if (!payment || payment.procedureRecord.clubId !== ctx.club.id || payment.procedureRecord.procedureTypeId !== procedureType.id) {
      throw new Error('Payment not found');
    }

    await prisma.procedurePayment.delete({ where: { id: paymentId } });

    return { success: true };
  }

  async updateReceipt(
    ctx: ClubAuthContext,
    procedureTypeCode: string,
    receiptId: string,
    input: { documentType?: string; documentNumber?: string; annotations?: string }
  ) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const receipt = await prisma.procedureReceipt.findFirst({
      where: { id: receiptId },
      include: { procedureRecord: { select: { procedureTypeId: true, clubId: true } } },
    });
    if (!receipt || receipt.procedureRecord.clubId !== ctx.club.id || receipt.procedureRecord.procedureTypeId !== procedureType.id) {
      throw new Error('Receipt not found');
    }

    const data: Record<string, unknown> = {};
    if (input.documentType !== undefined) data.documentType = input.documentType;
    if (input.documentNumber !== undefined) data.documentNumber = input.documentNumber;
    if (input.annotations !== undefined) data.annotations = input.annotations;

    await prisma.procedureReceipt.update({
      where: { id: receiptId },
      data: data as Prisma.ProcedureReceiptUpdateInput,
    });

    return { success: true };
  }

  async deleteReceipt(ctx: ClubAuthContext, procedureTypeCode: string, receiptId: string) {
    const procedureType = await this.getProcedureTypeByCode(procedureTypeCode);
    if (!procedureType) throw new Error('Unknown procedure type');

    const receipt = await prisma.procedureReceipt.findFirst({
      where: { id: receiptId },
      include: { procedureRecord: { select: { procedureTypeId: true, clubId: true } } },
    });
    if (!receipt || receipt.procedureRecord.clubId !== ctx.club.id || receipt.procedureRecord.procedureTypeId !== procedureType.id) {
      throw new Error('Receipt not found');
    }

    await prisma.procedureReceipt.delete({ where: { id: receiptId } });

    return { success: true };
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

    const profileById = await loadUserProfiles(
      rows.flatMap((r) => [r.memberId, r.operatorId].filter(Boolean) as string[])
    );

    const items: ProcedureRecordDto[] = rows.map((row) => ({
      id: row.id,
      procedureTypeCode,
      clubId: row.clubId,
      memberId: row.memberId,
      memberName: profileById.get(row.memberId)?.name ?? row.memberId,
      memberImage: profileById.get(row.memberId)?.image ?? null,
      operatorId: row.operatorId,
      operatorName: row.operatorId ? profileById.get(row.operatorId)?.name ?? '-' : '-',
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
        include: { procedureRecord: { select: { memberId: true, metadata: true, totalAmount: true, balanceAmount: true } } },
      }),
    ]);

    const nameById = await loadUserNames(
      rows.flatMap((r) => [r.procedureRecord.memberId, r.operatorId].filter(Boolean) as string[])
    );

    const items: ProcedurePaymentDto[] = rows.map((row) => {
      const metadata = (row.procedureRecord.metadata as Record<string, unknown> | null) ?? null;
      const def = getProcedureDefinition(procedureTypeCode);
      const primaryKey = def?.metadataKeys.primary ?? 'serviceName';
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
        serviceName: metaString(metadata, primaryKey) || null,
        typology: getProcedureTypology(procedureTypeCode),
        balanceAfter: readBalanceAfter(row),
        originalDebt: decimalToNumber(row.procedureRecord.totalAmount),
        residualDebt: decimalToNumber(row.procedureRecord.balanceAmount),
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
        include: {
          procedureRecord: { select: { metadata: true } },
        },
      }),
    ]);

    const nameById = await loadUserNames(
      rows.flatMap((r) => [r.memberId, r.operatorId].filter(Boolean) as string[])
    );

    const items: ProcedureReceiptDto[] = rows.map((row) => ({
      id: row.id,
      procedureRecordId: row.procedureRecordId,
      procedurePaymentId: row.procedurePaymentId,
      memberName: receiptMemberName(
        row.memberId,
        (row.procedureRecord.metadata as Record<string, unknown> | null) ?? null,
        nameById
      ),
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      amount: decimalToNumber(row.amount),
      paymentAmount: decimalToNumber(row.paymentAmount),
      serviceName: row.serviceName,
      receiptDate: row.receiptDate.toISOString().slice(0, 10),
      annotations: row.annotations,
      typology: getProcedureTypology(procedureTypeCode),
      operatorName: row.operatorId ? nameById.get(row.operatorId) ?? '-' : '-',
    }));

    return paginated(items, total, page, pageSize);
  }
}

export const procedureService = new ProcedureService();
