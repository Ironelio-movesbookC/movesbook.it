import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export type ClubAuthContext = {
  userId: string;
  legacyUserId: string | null;
  club: { id: string; name: string };
  userIds: string[];
};

const PURCHASE_TABLE_CANDIDATES = ['service_purchases', 'service_purchase'];
const DETAIL_TABLE_CANDIDATES = ['service_purchases_details', 'service_purchases_detail'];
const RECEIPT_TABLE = 'club_service_receipts';
const SERVICE_TABLE_CANDIDATES = ['club_setting_services', 'club_setting_service'];
const SECTOR_TABLE_CANDIDATES = ['club_setting_sectors', 'club_setting_sector'];

const PURCHASE_COLUMNS: Record<string, string> = {
  user_id: 'VARCHAR(191) NOT NULL',
  club_id: 'VARCHAR(191) NOT NULL',
  operator_id: 'VARCHAR(191) NULL',
  sector_id: 'VARCHAR(191) NULL',
  service_id: 'VARCHAR(191) NULL',
  type: 'TINYINT DEFAULT 2',
  value: 'DECIMAL(12,2) DEFAULT 0',
  pay: 'DECIMAL(12,2) DEFAULT 0',
  rest: 'DECIMAL(12,2) DEFAULT 0',
  paydate: 'DATE NULL',
  casual: 'TEXT NULL',
  annotation: 'TEXT NULL',
  pay_mode: 'VARCHAR(50) NULL',
  tax_doc: 'TINYINT(1) DEFAULT 0',
  discount: 'DECIMAL(12,2) DEFAULT 0',
  delete_status: 'TINYINT(1) DEFAULT 0',
  created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
};

const DETAIL_COLUMNS: Record<string, string> = {
  sp_id: 'BIGINT NOT NULL',
  paid: 'DECIMAL(12,2) DEFAULT 0',
  balance: 'DECIMAL(12,2) DEFAULT 0',
  payment_date: 'DATE NULL',
  expire_date: 'DATE NULL',
  description: 'TEXT NULL',
  created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
};

const RECEIPT_COLUMNS: Record<string, string> = {
  sp_id: 'BIGINT NOT NULL',
  sp_detail_id: 'BIGINT NULL',
  user_id: 'VARCHAR(191) NOT NULL',
  club_id: 'VARCHAR(191) NOT NULL',
  operator_id: 'VARCHAR(191) NULL',
  document_type: 'VARCHAR(100) NULL',
  document_number: 'VARCHAR(100) NULL',
  cost: 'DECIMAL(12,2) DEFAULT 0',
  payment_in: 'DECIMAL(12,2) DEFAULT 0',
  annotations: 'TEXT NULL',
  service_name: 'VARCHAR(255) NULL',
  receipt_date: 'DATE NULL',
  created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
};

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function isClubUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

export async function findExistingTable(candidates: string[]): Promise<string | null> {
  if (candidates.length === 0) return null;
  const placeholders = candidates.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );
  const existing = new Set(rows.map((r) => r.TABLE_NAME));
  return candidates.find((c) => existing.has(c)) ?? null;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    tableName
  );
  return new Set(rows.map((r) => r.COLUMN_NAME));
}

async function ensureTable(
  tableName: string,
  columns: Record<string, string>,
  indexes?: string
): Promise<void> {
  const columnSql = Object.entries(columns)
    .map(([col, def]) => `\`${col}\` ${def}`)
    .join(',\n        ');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ${columnSql}
      ${indexes ? `,\n      ${indexes}` : ''}
    )
  `);

  const existing = await getTableColumns(tableName);
  for (const [col, def] of Object.entries(columns)) {
    if (!existing.has(col)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${col}\` ${def}`
      );
    }
  }
}

export async function ensurePurchaseTables(): Promise<{
  purchaseTable: string;
  detailTable: string;
  receiptTable: string;
}> {
  const existingPurchase = await findExistingTable(PURCHASE_TABLE_CANDIDATES);
  const purchaseTable = existingPurchase ?? 'service_purchases';
  if (!existingPurchase) {
    await ensureTable(
      purchaseTable,
      PURCHASE_COLUMNS,
      'INDEX idx_sp_club (club_id), INDEX idx_sp_user (user_id), INDEX idx_sp_delete (delete_status)'
    );
  } else {
    await ensureTable(purchaseTable, PURCHASE_COLUMNS);
  }

  const existingDetail = await findExistingTable(DETAIL_TABLE_CANDIDATES);
  const detailTable = existingDetail ?? 'service_purchases_details';
  if (!existingDetail) {
    await ensureTable(
      detailTable,
      DETAIL_COLUMNS,
      'INDEX idx_spd_sp (sp_id)'
    );
  } else {
    await ensureTable(detailTable, DETAIL_COLUMNS);
  }

  await ensureTable(
    RECEIPT_TABLE,
    RECEIPT_COLUMNS,
    'INDEX idx_csr_club (club_id), INDEX idx_csr_sp (sp_id)'
  );

  return { purchaseTable, detailTable, receiptTable: RECEIPT_TABLE };
}

async function getLegacyUserId(userId: string): Promise<string | null> {
  const fromId = userId.match(/^legacy_(\d+)(?:_|$)/);
  if (fromId?.[1]) return fromId[1];

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id FROM \`${mappingTable}\`
     WHERE new_id = ? AND legacy_table = 'users'
     ORDER BY legacy_id DESC LIMIT 1`,
    userId
  );
  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name FROM clubs_new
      WHERE id = ${requestedClubId} AND adminId = ${userId} LIMIT 1
    `;
    if (selected[0]) return selected[0];
  }

  const fallback = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC LIMIT 1
  `;
  return fallback[0] ?? null;
}

export async function getClubAuthContext(
  request: NextRequest
): Promise<{ ctx: ClubAuthContext } | { error: NextResponse }> {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const decoded = verifyToken(token);
  if (!decoded?.userId || !decoded.userType) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isClubUserType(String(decoded.userType))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const userId = String(decoded.userId);
  const requestedClubId = request.nextUrl.searchParams.get('clubId');
  const club = await getOwnedClub(userId, requestedClubId);

  if (!club) {
    return { error: NextResponse.json({ error: 'Club not found' }, { status: 404 }) };
  }

  const legacyUserId = await getLegacyUserId(userId);
  const userIds = Array.from(new Set([userId, legacyUserId].filter(Boolean) as string[]));

  return {
    ctx: { userId, legacyUserId, club, userIds },
  };
}

export type ServicePurchaseRow = {
  id: string;
  userId: string;
  memberName: string;
  memberImage: string | null;
  typology: string;
  sectorName: string;
  serviceName: string;
  paydate: string | null;
  value: number;
  pay: number;
  rest: number;
  notes: string;
  operatorId: string | null;
  operatorName: string;
  lastPaymentDate: string | null;
};

async function resolveUserName(userId: string): Promise<{ name: string; image: string | null }> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, firstName: true, surname: true, username: true },
    });
    if (user) {
      const name =
        [user.firstName, user.surname].filter(Boolean).join(' ').trim() ||
        user.name ||
        user.username;
      return { name, image: null };
    }
  } catch {
    /* legacy id may not be in prisma */
  }
  return { name: userId, image: null };
}

async function resolveOperatorName(operatorId: string | null): Promise<string> {
  if (!operatorId) return '-';
  const { name } = await resolveUserName(operatorId);
  return name;
}

export async function fetchPurchases(
  clubId: string,
  options: { onlyWithRest?: boolean; purchaseId?: string } = {}
): Promise<ServicePurchaseRow[]> {
  const { purchaseTable, detailTable } = await ensurePurchaseTables();
  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);
  const sectorTable = await findExistingTable(SECTOR_TABLE_CANDIDATES);

  let where = `sp.club_id = ? AND (sp.delete_status = 0 OR sp.delete_status IS NULL)`;
  const params: unknown[] = [clubId];

  if (options.purchaseId) {
    where += ` AND sp.id = ?`;
    params.push(options.purchaseId);
  }
  if (options.onlyWithRest) {
    where += ` AND sp.rest > 0`;
  }

  const serviceJoin = serviceTable
    ? `LEFT JOIN \`${serviceTable}\` svc ON CAST(svc.id AS CHAR) = CAST(sp.service_id AS CHAR)`
    : '';
  const sectorJoin =
    serviceTable && sectorTable
      ? `LEFT JOIN \`${sectorTable}\` sec ON CAST(sec.id AS CHAR) = CAST(svc.sector_id AS CHAR)`
      : sectorTable
        ? `LEFT JOIN \`${sectorTable}\` sec ON CAST(sec.id AS CHAR) = CAST(sp.sector_id AS CHAR)`
        : '';

  const rows = await prisma.$queryRawUnsafe<
    {
      id: bigint | number;
      user_id: string;
      operator_id: string | null;
      value: number | string;
      pay: number | string;
      rest: number | string;
      paydate: Date | string | null;
      casual: string | null;
      annotation: string | null;
      service_name?: string | null;
      sector_name?: string | null;
      last_payment_date?: Date | string | null;
    }[]
  >(
    `SELECT sp.*,
            svc.service_name,
            sec.sector_name,
            (SELECT MAX(spd.payment_date) FROM \`${detailTable}\` spd WHERE spd.sp_id = sp.id) AS last_payment_date
     FROM \`${purchaseTable}\` sp
     ${serviceJoin}
     ${sectorJoin}
     WHERE ${where}
     ORDER BY sp.id DESC`,
    ...params
  );

  const result: ServicePurchaseRow[] = [];
  for (const row of rows) {
    const userId = String(row.user_id);
    const { name, image } = await resolveUserName(userId);
    const operatorName = await resolveOperatorName(row.operator_id);

    result.push({
      id: String(row.id),
      userId,
      memberName: name,
      memberImage: image,
      typology: 'SERVICES',
      sectorName: text(row.sector_name) || '-',
      serviceName: text(row.service_name) || '-',
      paydate: row.paydate ? String(row.paydate).slice(0, 10) : null,
      value: num(row.value),
      pay: num(row.pay),
      rest: num(row.rest),
      notes: text(row.annotation) || text(row.casual),
      operatorId: row.operator_id,
      operatorName,
      lastPaymentDate: row.last_payment_date
        ? String(row.last_payment_date).slice(0, 10)
        : null,
    });
  }

  return result;
}

export type PaymentDetailRow = {
  id: string;
  spId: string;
  memberName: string;
  typology: string;
  serviceName: string;
  paymentDate: string | null;
  paid: number;
  balance: number;
  description: string;
  operatorName: string;
};

export async function fetchPaymentDetails(
  clubId: string,
  spId?: string
): Promise<PaymentDetailRow[]> {
  const { purchaseTable, detailTable } = await ensurePurchaseTables();
  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);

  let where = `sp.club_id = ? AND (sp.delete_status = 0 OR sp.delete_status IS NULL)`;
  const params: unknown[] = [clubId];

  if (spId) {
    where += ` AND spd.sp_id = ?`;
    params.push(spId);
  }

  const serviceJoin = serviceTable
    ? `LEFT JOIN \`${serviceTable}\` svc ON CAST(svc.id AS CHAR) = CAST(sp.service_id AS CHAR)`
    : '';

  const rows = await prisma.$queryRawUnsafe<
    {
      id: bigint | number;
      sp_id: bigint | number;
      user_id: string;
      operator_id: string | null;
      paid: number | string;
      balance: number | string;
      payment_date: Date | string | null;
      description: string | null;
      service_name?: string | null;
    }[]
  >(
    `SELECT spd.*, sp.user_id, sp.operator_id, svc.service_name
     FROM \`${detailTable}\` spd
     INNER JOIN \`${purchaseTable}\` sp ON sp.id = spd.sp_id
     ${serviceJoin}
     WHERE ${where}
     ORDER BY spd.id DESC`,
    ...params
  );

  const result: PaymentDetailRow[] = [];
  for (const row of rows) {
    const { name } = await resolveUserName(String(row.user_id));
    const operatorName = await resolveOperatorName(row.operator_id);

    result.push({
      id: String(row.id),
      spId: String(row.sp_id),
      memberName: name,
      typology: 'SERVICES',
      serviceName: text(row.service_name) || '-',
      paymentDate: row.payment_date ? String(row.payment_date).slice(0, 10) : null,
      paid: num(row.paid),
      balance: num(row.balance),
      description: text(row.description),
      operatorName,
    });
  }

  return result;
}

export type ReceiptRow = {
  id: string;
  spId: string;
  memberName: string;
  typology: string;
  serviceName: string;
  receiptDate: string | null;
  documentType: string;
  documentNumber: string;
  cost: number;
  paymentIn: number;
  annotations: string;
  operatorName: string;
};

export async function fetchReceipts(clubId: string): Promise<ReceiptRow[]> {
  const { receiptTable } = await ensurePurchaseTables();

  const rows = await prisma.$queryRawUnsafe<
    {
      id: bigint | number;
      sp_id: bigint | number;
      user_id: string;
      operator_id: string | null;
      document_type: string | null;
      document_number: string | null;
      cost: number | string;
      payment_in: number | string;
      annotations: string | null;
      service_name: string | null;
      receipt_date: Date | string | null;
    }[]
  >(
    `SELECT * FROM \`${receiptTable}\`
     WHERE club_id = ?
     ORDER BY id DESC`,
    clubId
  );

  const result: ReceiptRow[] = [];
  for (const row of rows) {
    const { name } = await resolveUserName(String(row.user_id));
    const operatorName = await resolveOperatorName(row.operator_id);

    result.push({
      id: String(row.id),
      spId: String(row.sp_id),
      memberName: name,
      typology: 'SERVICES',
      serviceName: text(row.service_name) || '-',
      receiptDate: row.receipt_date ? String(row.receipt_date).slice(0, 10) : null,
      documentType: text(row.document_type) || 'Invoice',
      documentNumber: text(row.document_number),
      cost: num(row.cost),
      paymentIn: num(row.payment_in),
      annotations: text(row.annotations),
      operatorName,
    });
  }

  return result;
}

export type CreatePurchaseInput = {
  userId: string;
  sectorId: string;
  serviceId: string;
  value: number;
  pay?: number;
  paydate: string;
  notes?: string;
  payMode?: string;
  operatorId?: string;
  createReceipt?: boolean;
  receiptDocumentType?: string;
  receiptNumber?: string;
  receiptAnnotations?: string;
};

export async function createServicePurchase(
  ctx: ClubAuthContext,
  input: CreatePurchaseInput
): Promise<{ purchaseId: string; detailId: string | null; receiptId: string | null }> {
  const { purchaseTable, detailTable, receiptTable } = await ensurePurchaseTables();
  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);

  const value = num(input.value);
  const pay = num(input.pay);
  const rest = Math.max(0, value - pay);
  const paydate = input.paydate.slice(0, 10);
  const operatorId = input.operatorId || ctx.userId;
  const notes = text(input.notes);

  let serviceName = '';
  if (serviceTable && input.serviceId) {
    const svcRows = await prisma.$queryRawUnsafe<{ service_name: string }[]>(
      `SELECT service_name FROM \`${serviceTable}\` WHERE id = ? LIMIT 1`,
      input.serviceId
    );
    serviceName = text(svcRows[0]?.service_name);
  }

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${purchaseTable}\`
     (user_id, club_id, operator_id, sector_id, service_id, type, value, pay, rest, paydate, casual, annotation, pay_mode, tax_doc, delete_status)
     VALUES (?, ?, ?, ?, ?, 2, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    input.userId,
    ctx.club.id,
    operatorId,
    input.sectorId || null,
    input.serviceId || null,
    value,
    pay,
    rest,
    paydate,
    notes,
    notes,
    input.payMode || null,
    input.createReceipt ? 1 : 0
  );

  const idRows = await prisma.$queryRawUnsafe<{ id: bigint }[]>(`SELECT LAST_INSERT_ID() AS id`);
  const purchaseId = String(idRows[0]?.id ?? '');

  let detailId: string | null = null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${detailTable}\`
     (sp_id, paid, balance, payment_date, description)
     VALUES (?, ?, ?, ?, ?)`,
    purchaseId,
    pay,
    rest,
    paydate,
    notes || null
  );
  const detailIdRows = await prisma.$queryRawUnsafe<{ id: bigint }[]>(`SELECT LAST_INSERT_ID() AS id`);
  detailId = String(detailIdRows[0]?.id ?? '');

  let receiptId: string | null = null;
  if (input.createReceipt && pay > 0) {
    const docNumber =
      input.receiptNumber ||
      `${String(new Date().getFullYear())}-${String(purchaseId).padStart(4, '0')}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${receiptTable}\`
       (sp_id, sp_detail_id, user_id, club_id, operator_id, document_type, document_number, cost, payment_in, annotations, service_name, receipt_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      purchaseId,
      detailId,
      input.userId,
      ctx.club.id,
      operatorId,
      input.receiptDocumentType || 'Invoice',
      docNumber,
      value,
      pay,
      input.receiptAnnotations || notes,
      serviceName,
      paydate
    );
    const receiptIdRows = await prisma.$queryRawUnsafe<{ id: bigint }[]>(
      `SELECT LAST_INSERT_ID() AS id`
    );
    receiptId = String(receiptIdRows[0]?.id ?? '');
  }

  return { purchaseId, detailId, receiptId };
}

export type AddPaymentInput = {
  amountPaid: number;
  paymentDate: string;
  notes?: string;
  payMode?: string;
  operatorId?: string;
  createReceipt?: boolean;
  receiptDocumentType?: string;
  receiptNumber?: string;
  receiptAnnotations?: string;
};

export async function addPaymentToPurchase(
  ctx: ClubAuthContext,
  purchaseId: string,
  input: AddPaymentInput
): Promise<{ detailId: string; receiptId: string | null }> {
  const { purchaseTable, detailTable, receiptTable } = await ensurePurchaseTables();
  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);

  const rows = await prisma.$queryRawUnsafe<
    {
      id: bigint | number;
      user_id: string;
      service_id: string | null;
      value: number | string;
      pay: number | string;
      rest: number | string;
    }[]
  >(
    `SELECT id, user_id, service_id, value, pay, rest FROM \`${purchaseTable}\`
     WHERE id = ? AND club_id = ? AND (delete_status = 0 OR delete_status IS NULL) LIMIT 1`,
    purchaseId,
    ctx.club.id
  );

  const purchase = rows[0];
  if (!purchase) {
    throw new Error('Purchase not found');
  }

  const amountPaid = num(input.amountPaid);
  if (amountPaid <= 0) {
    throw new Error('Payment amount must be greater than 0');
  }

  const currentPay = num(purchase.pay);
  const currentRest = num(purchase.rest);
  if (amountPaid > currentRest) {
    throw new Error('Payment exceeds remaining balance');
  }

  const newPay = currentPay + amountPaid;
  const newRest = currentRest - amountPaid;
  const paymentDate = input.paymentDate.slice(0, 10);
  const operatorId = input.operatorId || ctx.userId;
  const notes = text(input.notes);

  await prisma.$executeRawUnsafe(
    `UPDATE \`${purchaseTable}\` SET pay = ?, rest = ?, operator_id = ?, modified = NOW() WHERE id = ?`,
    newPay,
    newRest,
    operatorId,
    purchaseId
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${detailTable}\`
     (sp_id, paid, balance, payment_date, description)
     VALUES (?, ?, ?, ?, ?)`,
    purchaseId,
    amountPaid,
    newRest,
    paymentDate,
    notes || null
  );

  const detailIdRows = await prisma.$queryRawUnsafe<{ id: bigint }[]>(`SELECT LAST_INSERT_ID() AS id`);
  const detailId = String(detailIdRows[0]?.id ?? '');

  let receiptId: string | null = null;
  if (input.createReceipt) {
    let serviceName = '';
    if (serviceTable && purchase.service_id) {
      const svcRows = await prisma.$queryRawUnsafe<{ service_name: string }[]>(
        `SELECT service_name FROM \`${serviceTable}\` WHERE id = ? LIMIT 1`,
        purchase.service_id
      );
      serviceName = text(svcRows[0]?.service_name);
    }

    const docNumber =
      input.receiptNumber ||
      `${String(new Date().getFullYear())}-${String(detailId).padStart(4, '0')}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${receiptTable}\`
       (sp_id, sp_detail_id, user_id, club_id, operator_id, document_type, document_number, cost, payment_in, annotations, service_name, receipt_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      purchaseId,
      detailId,
      purchase.user_id,
      ctx.club.id,
      operatorId,
      input.receiptDocumentType || 'Invoice',
      docNumber,
      num(purchase.value),
      amountPaid,
      input.receiptAnnotations || notes,
      serviceName,
      paymentDate
    );
    const receiptIdRows = await prisma.$queryRawUnsafe<{ id: bigint }[]>(
      `SELECT LAST_INSERT_ID() AS id`
    );
    receiptId = String(receiptIdRows[0]?.id ?? '');
  }

  return { detailId, receiptId };
}

export async function softDeletePurchase(clubId: string, purchaseId: string): Promise<void> {
  const { purchaseTable } = await ensurePurchaseTables();
  await prisma.$executeRawUnsafe(
    `UPDATE \`${purchaseTable}\` SET delete_status = 1, modified = NOW()
     WHERE id = ? AND club_id = ?`,
    purchaseId,
    clubId
  );
}

export async function getServiceCost(serviceId: string): Promise<number | null> {
  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);
  if (!serviceTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ club_currency_cost: string | number | null }[]>(
    `SELECT club_currency_cost FROM \`${serviceTable}\` WHERE id = ? LIMIT 1`,
    serviceId
  );
  if (!rows[0]?.club_currency_cost) return null;
  return num(rows[0].club_currency_cost);
}

export async function fetchFormOptions(clubId: string) {
  const serviceTable = await findExistingTable(SERVICE_TABLE_CANDIDATES);
  const sectorTable = await findExistingTable(SECTOR_TABLE_CANDIDATES);

  const sectors: { id: string; name: string }[] = [];
  const services: { id: string; name: string; sectorId: string; cost: number }[] = [];
  const members: { id: string; name: string }[] = [];

  if (sectorTable) {
    const sectorRows = await prisma.$queryRawUnsafe<{ id: bigint | number; sector_name: string }[]>(
      `SELECT id, sector_name FROM \`${sectorTable}\` ORDER BY sector_name ASC`
    );
    for (const s of sectorRows) {
      sectors.push({ id: String(s.id), name: text(s.sector_name) });
    }
  }

  if (serviceTable) {
    const serviceRows = await prisma.$queryRawUnsafe<
      { id: bigint | number; service_name: string; sector_id: string | number | null; club_currency_cost: string | number | null }[]
    >(
      `SELECT id, service_name, sector_id, club_currency_cost FROM \`${serviceTable}\` ORDER BY service_name ASC`
    );
    for (const s of serviceRows) {
      services.push({
        id: String(s.id),
        name: text(s.service_name),
        sectorId: s.sector_id != null ? String(s.sector_id) : '',
        cost: num(s.club_currency_cost),
      });
    }
  }

  const clubMembers = await prisma.clubMember.findMany({
    where: { clubId },
    include: {
      member: {
        select: { id: true, name: true, firstName: true, surname: true, username: true },
      },
    },
  });

  for (const cm of clubMembers) {
    const m = cm.member;
    const name =
      [m.firstName, m.surname].filter(Boolean).join(' ').trim() || m.name || m.username;
    members.push({ id: m.id, name });
  }

  return { sectors, services, members };
}
