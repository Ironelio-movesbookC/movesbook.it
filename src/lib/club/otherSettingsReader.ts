import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import type { TaxDocumentClubSettings } from '@/lib/procedures/taxDocumentDefaults';
import { counterKeyForDocumentType } from '@/lib/procedures/taxDocumentDefaults';

const TABLE_NAME = 'club_reader_other_settings';

const COUNTER_COLUMNS: Record<'taxReceipt' | 'invoice' | 'simpleReceipt', string> = {
  taxReceipt: 'tax_receipt',
  invoice: 'invoice',
  simpleReceipt: 'simple_receipt',
};

function toBooleanFlag(value: unknown): boolean {
  return value === true
    || value === 1
    || value === '1'
    || value === 'Y'
    || value === 'y'
    || value === 'T'
    || value === 't'
    || value === 'true';
}

function text(value: unknown): string {
  return value == null ? '' : String(value);
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    tableName
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
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

type FetchContext = {
  userId: string;
  clubId: string;
};

async function fetchSettingsRow(context: FetchContext): Promise<Record<string, unknown> | null> {
  const tableName = await findExistingTable([TABLE_NAME]);
  if (!tableName) return null;

  const columns = await getTableColumns(tableName);
  const legacyUserId = await getLegacyUserId(context.userId);
  const userIds = Array.from(new Set([context.userId, legacyUserId].filter(Boolean) as string[]));
  const userPlaceholders = userIds.map(() => '?').join(',');

  const selectColumns = [
    'document_type',
    'enable_header',
    'primary_heading',
    'secondary_heading',
    'tax',
    'cal_tax_status',
    'tax_receipt',
    'invoice',
    'simple_receipt',
  ].filter((column) => columns.has(column));

  if (selectColumns.length === 0) return null;

  const orderBy = columns.has('modified')
    ? 'modified DESC'
    : columns.has('created')
      ? 'created DESC'
      : 'id DESC';

  if (columns.has('club_user_id')) {
    if (columns.has('club_id')) {
      const scopedRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${selectColumns.map((c) => `\`${c}\``).join(', ')}
         FROM \`${tableName}\`
         WHERE club_user_id IN (${userPlaceholders})
           AND club_id = ?
         ORDER BY ${orderBy}
         LIMIT 1`,
        ...userIds,
        context.clubId
      );
      if (scopedRows[0]) return scopedRows[0];
    }

    const userRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${selectColumns.map((c) => `\`${c}\``).join(', ')}
       FROM \`${tableName}\`
       WHERE club_user_id IN (${userPlaceholders})
       ORDER BY ${orderBy}
       LIMIT 1`,
      ...userIds
    );
    if (userRows[0]) return userRows[0];
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${selectColumns.map((c) => `\`${c}\``).join(', ')}
     FROM \`${tableName}\`
     ORDER BY ${orderBy}
     LIMIT 1`
  );

  return rows[0] ?? null;
}

export async function fetchTaxDocumentClubSettings(
  context: FetchContext
): Promise<TaxDocumentClubSettings> {
  const row = await fetchSettingsRow(context);
  if (!row) {
    return {
      documentType: 'Tax receipt',
      enableHeader: 'primary',
      primaryHeading: '',
      secondaryHeading: '',
      tax: '',
      calTaxStatus: false,
      taxReceipt: '',
      invoice: '',
      simpleReceipt: '',
    };
  }

  return {
    documentType: text(row.document_type) || 'Tax receipt',
    enableHeader: text(row.enable_header) || 'primary',
    primaryHeading: text(row.primary_heading),
    secondaryHeading: text(row.secondary_heading),
    tax: text(row.tax),
    calTaxStatus: toBooleanFlag(row.cal_tax_status),
    taxReceipt: text(row.tax_receipt),
    invoice: text(row.invoice),
    simpleReceipt: text(row.simple_receipt),
  };
}

export async function updateTaxDocumentCounter(
  context: FetchContext,
  documentType: string,
  documentNumber: string
): Promise<void> {
  const tableName = await findExistingTable([TABLE_NAME]);
  if (!tableName) return;

  const columns = await getTableColumns(tableName);
  const counterKey = counterKeyForDocumentType(documentType);
  const column = COUNTER_COLUMNS[counterKey];
  if (!columns.has(column)) return;

  const legacyUserId = await getLegacyUserId(context.userId);
  const userIds = Array.from(new Set([context.userId, legacyUserId].filter(Boolean) as string[]));
  const userPlaceholders = userIds.map(() => '?').join(',');
  const storageUserId = legacyUserId ?? context.userId;
  const counterValue = String(documentNumber ?? '').trim();
  if (!counterValue) return;

  const existing = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT id
     FROM \`${tableName}\`
     WHERE club_user_id IN (${userPlaceholders})
       ${columns.has('club_id') ? 'AND club_id = ?' : ''}
     ORDER BY id DESC
     LIMIT 1`,
    ...userIds,
    ...(columns.has('club_id') ? [context.clubId] : [])
  );

  if (existing[0]) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET \`${column}\` = ?
       ${columns.has('modified') ? ', modified = CURRENT_TIMESTAMP' : ''}
       WHERE id = ?`,
      counterValue,
      existing[0].id
    );
    return;
  }

  const insertColumns = [
    ...(columns.has('club_user_id') ? ['club_user_id'] : []),
    ...(columns.has('club_id') ? ['club_id'] : []),
    column,
  ];
  const insertValues = [
    ...(columns.has('club_user_id') ? [storageUserId] : []),
    ...(columns.has('club_id') ? [context.clubId] : []),
    counterValue,
  ];

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${tableName}\`
       (${insertColumns.map((c) => `\`${c}\``).join(', ')})
     VALUES (${insertColumns.map(() => '?').join(', ')})`,
    ...insertValues
  );
}
