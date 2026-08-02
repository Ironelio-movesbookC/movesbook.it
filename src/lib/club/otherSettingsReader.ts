import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import type { TaxDocumentClubSettings } from '@/lib/procedures/taxDocumentDefaults';
import { counterKeyForDocumentType } from '@/lib/procedures/taxDocumentDefaults';

const TABLE_NAME = 'club_reader_other_settings';
const JSON_TABLE_NAME = 'club_other_settings';

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

const REQUIRED_COLUMNS: Record<string, string> = {
  document_type: 'VARCHAR(80) NULL',
  enable_header: 'VARCHAR(50) NULL',
  primary_heading: 'VARCHAR(255) NULL',
  secondary_heading: 'VARCHAR(255) NULL',
  tax: 'VARCHAR(50) NULL',
  cal_tax_status: "CHAR(1) NOT NULL DEFAULT 'N'",
  tax_receipt: 'VARCHAR(50) NULL',
  invoice: 'VARCHAR(50) NULL',
  simple_receipt: 'VARCHAR(50) NULL',
};

async function ensureReaderColumns(tableName: string): Promise<void> {
  const columns = await getTableColumns(tableName);
  for (const [column, definition] of Object.entries(REQUIRED_COLUMNS)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${tableName}\` ADD COLUMN \`${column}\` ${definition}`
      );
    }
  }
}

async function fetchSettingsRow(context: FetchContext): Promise<Record<string, unknown> | null> {
  const tableName = await findExistingTable([TABLE_NAME]);
  if (!tableName) return null;

  await ensureReaderColumns(tableName);

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

function parseSavedJson(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

async function fetchJsonSettingsFallback(context: FetchContext): Promise<Record<string, unknown> | null> {
  const tableName = await findExistingTable([JSON_TABLE_NAME]);
  if (!tableName) return null;

  const columns = await getTableColumns(tableName);
  if (!columns.has('settings_json') || !columns.has('user_id')) return null;

  const legacyUserId = await getLegacyUserId(context.userId);
  const userIds = Array.from(new Set([context.userId, legacyUserId].filter(Boolean) as string[]));
  const userPlaceholders = userIds.map(() => '?').join(',');
  const clubFilter = columns.has('club_key') ? 'AND club_key = ?' : '';
  const modifiedOrder = columns.has('modified') ? 'modified DESC,' : '';
  const rows = await prisma.$queryRawUnsafe<{ settings_json: string }[]>(
    `SELECT settings_json
     FROM \`${tableName}\`
     WHERE user_id IN (${userPlaceholders})
       ${clubFilter}
     ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, ${modifiedOrder} id DESC
     LIMIT 1`,
    ...userIds,
    ...(columns.has('club_key') ? [context.clubId] : []),
    context.userId
  );

  return parseSavedJson(rows[0]?.settings_json);
}

const DEFAULT_SETTINGS: TaxDocumentClubSettings = {
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

function toSettings(json: Record<string, unknown>): TaxDocumentClubSettings {
  return {
    documentType: text(json.documentType) || text(json.document_type) || 'Tax receipt',
    enableHeader: text(json.enableHeader) || text(json.enable_header) || 'primary',
    primaryHeading: text(json.primaryHeading) || text(json.primary_heading),
    secondaryHeading: text(json.secondaryHeading) || text(json.secondary_heading),
    tax: text(json.tax),
    calTaxStatus: toBooleanFlag(json.calTaxStatus) || toBooleanFlag(json.cal_tax_status),
    taxReceipt: text(json.taxReceipt) || text(json.tax_receipt),
    invoice: text(json.invoice),
    simpleReceipt: text(json.simpleReceipt) || text(json.simple_receipt),
  };
}

export async function fetchTaxDocumentClubSettings(
  context: FetchContext
): Promise<TaxDocumentClubSettings> {
  const json = await fetchJsonSettingsFallback(context);
  const row = await fetchSettingsRow(context);

  const jsonSettings = json ? toSettings(json) : null;
  const columnSettings = row ? {
    documentType: text(row.document_type) || 'Tax receipt',
    enableHeader: text(row.enable_header) || 'primary',
    primaryHeading: text(row.primary_heading),
    secondaryHeading: text(row.secondary_heading),
    tax: text(row.tax),
    calTaxStatus: toBooleanFlag(row.cal_tax_status),
    taxReceipt: text(row.tax_receipt),
    invoice: text(row.invoice),
    simpleReceipt: text(row.simple_receipt),
  } : null;

  function pick<T extends string | boolean>(col: T | undefined, json: T | undefined): T {
    if (col != null && col !== '' && col !== false) return col;
    if (json != null && json !== '' && json !== false) return json;
    return (col ?? json ?? '') as T;
  }

  if (columnSettings && jsonSettings) {
    return {
      documentType: pick(columnSettings.documentType, jsonSettings.documentType),
      enableHeader: pick(columnSettings.enableHeader, jsonSettings.enableHeader),
      primaryHeading: pick(columnSettings.primaryHeading, jsonSettings.primaryHeading),
      secondaryHeading: pick(columnSettings.secondaryHeading, jsonSettings.secondaryHeading),
      tax: pick(columnSettings.tax, jsonSettings.tax),
      calTaxStatus: pick(columnSettings.calTaxStatus, jsonSettings.calTaxStatus),
      taxReceipt: pick(columnSettings.taxReceipt, jsonSettings.taxReceipt),
      invoice: pick(columnSettings.invoice, jsonSettings.invoice),
      simpleReceipt: pick(columnSettings.simpleReceipt, jsonSettings.simpleReceipt),
    };
  }

  if (columnSettings) return columnSettings;
  if (jsonSettings) return jsonSettings;

  return DEFAULT_SETTINGS;
}

export async function updateTaxDocumentCounter(
  context: FetchContext,
  documentType: string,
  documentNumber: string
): Promise<void> {
  const tableName = await findExistingTable([TABLE_NAME]);
  if (!tableName) return;

  await ensureReaderColumns(tableName);

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
