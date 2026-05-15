import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

type OtherSettings = Record<string, string | boolean>;
type FieldErrors = Record<string, string>;

type AuthorizedContext = {
  userId: string;
  legacyUserId: string | null;
  club: { id: string; name: string } | null;
  userIds: string[];
};

const TABLE_NAME = 'club_reader_other_settings';
const JSON_TABLE_NAME = 'club_other_settings';

const DEFAULT_SETTINGS: OtherSettings = {
  clubName: '',
  passport: '',
  city: '',
  zip: '',
  areaCode: '',
  formPayDeadlineStatus: 'Yes',
  operatorPassStatus: 'Yes',
  calTaxStatus: false,
  tax: '',
  printTaxDetailStatus: false,
  pathSoundName: '',
  pathMessageAlert: '',
  durationDefault: 'one year',
  dateFixedValue: '',
  modeRenewal: 'until_exp_membership',
  costValue: '',
  calCostAuto: false,
  installmentDefault: '1',
  disableMembership: false,
  printInDocument: 'Y',
  documentLogo1: '',
  documentLogo2: '',
  documentType: 'Tax receipt',
  numberCopies: '1',
  rate: '',
  notEnterCustData: false,
  badgeFedaration: false,
  enableHeader: 'primary',
  primaryHeading: '',
  primaryAddress: '',
  primaryCity: '',
  primaryVat: '',
  secondaryHeading: '',
  secondaryAddress: '',
  secondaryCity: '',
  secondaryVat: '',
  taxReceiptModule: 'Standard',
  invoiceModule: 'Standard',
  simpleReceiptModule: '',
  taxReceipt: '',
  invoice: '',
  simpleReceipt: '',
  autoContractCounter: false,
  autoWithSubscription: false,
  contractStatus: '',
  contractTermText: '',
  previewPrint: false,
  changeHeader: false,
  renewalDay: '',
  renewalSession: '',
  retrodationDay: '',
  closingTime: false,
  closingTimeStartStatus1: false,
  closingTimeStart1: '',
  closingTimeEnd1: '',
  closingTimeStartStatus2: false,
  closingTimeStart2: '',
  closingTimeEnd2: '',
  closingTimeStartStatus3: false,
  closingTimeStart3: '',
  closingTimeEnd3: '',
  recoverLostDay: false,
  totalDaySub: '',
  allowMultipleSubscription: false,
  suspensionUpdateStatus: false,
  magneticCard: '',
  chipCard: '',
  rfidCard: '',
  rfidBracelet: '',
  genericSession: '',
  statusBar: false,
  quickToolbar: false,
  printToolbar: false,
  enableAssistant: false
};

const SETTING_COLUMNS: Record<string, string> = {
  clubName: 'club_name',
  passport: 'passport',
  city: 'city',
  zip: 'zip',
  areaCode: 'area_code',
  formPayDeadlineStatus: 'form_pay_deadline_status',
  operatorPassStatus: 'operator_pass_status',
  calTaxStatus: 'cal_tax_status',
  tax: 'tax',
  printTaxDetailStatus: 'print_tax_detail_status',
  pathSoundName: 'path_sound_name',
  pathMessageAlert: 'path_message_alert',
  durationDefault: 'duration_default',
  dateFixedValue: 'date_fixed_value',
  modeRenewal: 'mode_renewal',
  costValue: 'cost_value',
  calCostAuto: 'cal_cost_auto',
  installmentDefault: 'installment_default',
  disableMembership: 'disable_membership',
  printInDocument: 'print_in_document',
  documentLogo1: 'document_logo1',
  documentLogo2: 'document_logo2',
  documentType: 'document_type',
  numberCopies: 'number_copies',
  rate: 'rate',
  notEnterCustData: 'not_enter_cust_data',
  badgeFedaration: 'badge_fedaration',
  enableHeader: 'enable_header',
  primaryHeading: 'primary_heading',
  primaryAddress: 'primary_address',
  primaryCity: 'primary_city',
  primaryVat: 'primary_vat',
  secondaryHeading: 'secondary_heading',
  secondaryAddress: 'secondary_address',
  secondaryCity: 'secondary_city',
  secondaryVat: 'secondary_vat',
  taxReceiptModule: 'tax_receipt_module',
  invoiceModule: 'invoice_module',
  simpleReceiptModule: 'simple_receipt_module',
  taxReceipt: 'tax_receipt',
  invoice: 'invoice',
  simpleReceipt: 'simple_receipt',
  autoContractCounter: 'auto_contract_counter',
  autoWithSubscription: 'auto_with_subscription',
  contractStatus: 'contract_status',
  contractTermText: 'contract_term_text',
  previewPrint: 'preview_print',
  changeHeader: 'change_header',
  renewalDay: 'renewal_day',
  renewalSession: 'renewal_session',
  retrodationDay: 'retrodation_day',
  closingTime: 'closing_time',
  closingTimeStartStatus1: 'closing_time_start_status1',
  closingTimeStart1: 'closing_time_start1',
  closingTimeEnd1: 'closing_time_end1',
  closingTimeStartStatus2: 'closing_time_start_status2',
  closingTimeStart2: 'closing_time_start2',
  closingTimeEnd2: 'closing_time_end2',
  closingTimeStartStatus3: 'closing_time_start_status3',
  closingTimeStart3: 'closing_time_start3',
  closingTimeEnd3: 'closing_time_end3',
  recoverLostDay: 'recover_lost_day',
  totalDaySub: 'total_day_sub',
  allowMultipleSubscription: 'allow_multiple_subscription',
  suspensionUpdateStatus: 'suspension_update_status',
  magneticCard: 'magnetic_card',
  chipCard: 'chip_card',
  rfidCard: 'rfid_card',
  rfidBracelet: 'rfid_bracelet',
  genericSession: 'generic_session',
  statusBar: 'status_bar',
  quickToolbar: 'quick_toolbar',
  printToolbar: 'print_toolbar',
  enableAssistant: 'enable_assistant'
};

const BOOLEAN_COLUMNS = new Set(
  Object.entries(DEFAULT_SETTINGS)
    .filter(([, defaultValue]) => typeof defaultValue === 'boolean')
    .map(([key]) => SETTING_COLUMNS[key])
);

const COLUMN_DEFINITIONS: Record<string, string> = {
  club_user_id: 'VARCHAR(191) NULL',
  club_id: 'VARCHAR(191) NULL',
  club_name: 'VARCHAR(255) NULL',
  passport: 'VARCHAR(255) NULL',
  city: 'VARCHAR(255) NULL',
  zip: 'VARCHAR(20) NULL',
  area_code: 'VARCHAR(20) NULL',
  form_pay_deadline_status: 'VARCHAR(20) NULL',
  operator_pass_status: 'VARCHAR(20) NULL',
  cal_tax_status: "CHAR(1) NOT NULL DEFAULT 'N'",
  tax: 'VARCHAR(50) NULL',
  print_tax_detail_status: "CHAR(1) NOT NULL DEFAULT 'N'",
  path_sound_name: 'VARCHAR(255) NULL',
  path_sound: 'VARCHAR(255) NULL',
  path_message_alert: 'VARCHAR(255) NULL',
  duration_default: 'VARCHAR(50) NULL',
  date_fixed_value: 'VARCHAR(50) NULL',
  mode_renewal: 'VARCHAR(80) NULL',
  cost_value: 'VARCHAR(50) NULL',
  cal_cost_auto: "CHAR(1) NOT NULL DEFAULT 'N'",
  installment_default: 'VARCHAR(10) NULL',
  disable_membership: "CHAR(1) NOT NULL DEFAULT 'N'",
  print_in_document: "CHAR(1) NOT NULL DEFAULT 'Y'",
  document_logo: 'VARCHAR(255) NULL',
  document_logo1: 'VARCHAR(255) NULL',
  document_logo2: 'VARCHAR(255) NULL',
  document_type: 'VARCHAR(80) NULL',
  number_copies: 'VARCHAR(20) NULL',
  rate: 'VARCHAR(50) NULL',
  not_enter_cust_data: "CHAR(1) NOT NULL DEFAULT 'N'",
  badge_fedaration: "CHAR(1) NOT NULL DEFAULT 'N'",
  enable_header: 'VARCHAR(50) NULL',
  primary_heading: 'VARCHAR(255) NULL',
  primary_address: 'VARCHAR(255) NULL',
  primary_city: 'VARCHAR(255) NULL',
  primary_vat: 'VARCHAR(80) NULL',
  secondary_heading: 'VARCHAR(255) NULL',
  secondary_address: 'VARCHAR(255) NULL',
  secondary_city: 'VARCHAR(255) NULL',
  secondary_vat: 'VARCHAR(80) NULL',
  tax_receipt_module: 'VARCHAR(80) NULL',
  invoice_module: 'VARCHAR(80) NULL',
  simple_receipt_module: 'VARCHAR(80) NULL',
  tax_receipt: 'VARCHAR(50) NULL',
  invoice: 'VARCHAR(50) NULL',
  simple_receipt: 'VARCHAR(50) NULL',
  auto_contract_counter: "CHAR(1) NOT NULL DEFAULT 'N'",
  auto_with_subscription: "CHAR(1) NOT NULL DEFAULT 'N'",
  contract_status: 'VARCHAR(50) NULL',
  contract_term_text: 'LONGTEXT NULL',
  preview_print: "CHAR(1) NOT NULL DEFAULT 'N'",
  change_header: "CHAR(1) NOT NULL DEFAULT 'N'",
  renewal_day: 'VARCHAR(20) NULL',
  renewal_session: 'VARCHAR(20) NULL',
  retrodation_day: 'VARCHAR(20) NULL',
  closing_time: "CHAR(1) NOT NULL DEFAULT 'N'",
  closing_time_start_status1: "CHAR(1) NOT NULL DEFAULT 'N'",
  closing_time_start1: 'VARCHAR(50) NULL',
  closing_time_end1: 'VARCHAR(50) NULL',
  closing_time_start_status2: "CHAR(1) NOT NULL DEFAULT 'N'",
  closing_time_start2: 'VARCHAR(50) NULL',
  closing_time_end2: 'VARCHAR(50) NULL',
  closing_time_start_status3: "CHAR(1) NOT NULL DEFAULT 'N'",
  closing_time_start3: 'VARCHAR(50) NULL',
  closing_time_end3: 'VARCHAR(50) NULL',
  recover_lost_day: "CHAR(1) NOT NULL DEFAULT 'N'",
  total_day_sub: 'VARCHAR(50) NULL',
  allow_multiple_subscription: "CHAR(1) NOT NULL DEFAULT 'N'",
  suspension_update_status: "CHAR(1) NOT NULL DEFAULT 'N'",
  magnetic_card: 'VARCHAR(50) NULL',
  chip_card: 'VARCHAR(50) NULL',
  rfid_card: 'VARCHAR(50) NULL',
  rfid_bracelet: 'VARCHAR(50) NULL',
  generic_session: 'VARCHAR(50) NULL',
  status_bar: "CHAR(1) NOT NULL DEFAULT 'N'",
  quick_toolbar: "CHAR(1) NOT NULL DEFAULT 'N'",
  print_toolbar: "CHAR(1) NOT NULL DEFAULT 'N'",
  enable_assistant: "CHAR(1) NOT NULL DEFAULT 'N'",
  created: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
  modified: 'DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'
};

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
}

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

function normalizeSettings(input?: Record<string, unknown> | null): OtherSettings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!input) return settings;

  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    const raw = input[key];
    if (raw == null) continue;
    settings[key] = typeof defaultValue === 'boolean' ? toBooleanFlag(raw) : String(raw);
  }

  return settings;
}

function normalizeColumnSettings(row?: Record<string, unknown> | null): OtherSettings {
  const settings = { ...DEFAULT_SETTINGS };
  if (!row) return settings;

  for (const [key, column] of Object.entries(SETTING_COLUMNS)) {
    const defaultValue = DEFAULT_SETTINGS[key];
    const raw = row[column];
    if (raw == null) continue;
    settings[key] = typeof defaultValue === 'boolean' ? toBooleanFlag(raw) : String(raw);
  }

  return settings;
}

function parseSettingsBody(body: unknown): OtherSettings {
  const data = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const settings = { ...DEFAULT_SETTINGS };

  for (const [key, defaultValue] of Object.entries(DEFAULT_SETTINGS)) {
    const raw = data[key];
    settings[key] = typeof defaultValue === 'boolean'
      ? Boolean(raw)
      : raw == null
        ? defaultValue
        : String(raw);
  }

  return settings;
}

const closingDatePairs = [
  { label: 'Closing time 1', start: 'closingTimeStart1', end: 'closingTimeEnd1' },
  { label: 'Closing time 2', start: 'closingTimeStart2', end: 'closingTimeEnd2' },
  { label: 'Closing time 3', start: 'closingTimeStart3', end: 'closingTimeEnd3' }
] as const;

function getComparableDateKey(value: string) {
  const trimmed = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return `${iso[1]}${iso[2]}${iso[3]}`;

  const legacy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (legacy) return `${legacy[3]}${legacy[2]}${legacy[1]}`;

  return '';
}

function validateClosingDates(settings: OtherSettings, fieldErrors: FieldErrors) {
  for (const pair of closingDatePairs) {
    const start = String(settings[pair.start] || '').trim();
    const end = String(settings[pair.end] || '').trim();

    if (!start) {
      continue;
    }

    if (!end) {
      fieldErrors[pair.end] = `Please select end date for ${pair.label}.`;
      continue;
    }

    const startKey = getComparableDateKey(start);
    const endKey = getComparableDateKey(end);
    if (startKey && endKey && endKey <= startKey) {
      fieldErrors[pair.end] = `End date must be later than start date for ${pair.label}.`;
    }
  }
}

function validateSettings(settings: OtherSettings): FieldErrors {
  const fieldErrors: FieldErrors = {};
  const hasLetter = /[a-zA-Z]/;
  const clubName = String(settings.clubName || '').trim();
  const city = String(settings.city || '').trim();

  if (!clubName) {
    fieldErrors.clubName = 'Please enter club name.';
  } else if (!hasLetter.test(clubName)) {
    fieldErrors.clubName = 'Please enter valid club name.';
  }

  if (!city) {
    fieldErrors.city = 'Please enter city name.';
  } else if (!hasLetter.test(city)) {
    fieldErrors.city = 'Please enter valid city name.';
  }

  const soundName = String(settings.pathSoundName || '').trim();
  if (soundName && !soundName.toLowerCase().endsWith('.mp3')) {
    fieldErrors.pathSoundName = 'Please enter only .mp3 extension file for Path sounds.';
  }

  const installments = String(settings.installmentDefault || '').trim();
  const value = Number(installments);
  if (!installments || !Number.isInteger(value) || value < 1 || value > 3) {
    fieldErrors.installmentDefault = 'Please enter valid value number for Installments default (1 to 3).';
  }

  validateClosingDates(settings, fieldErrors);

  return fieldErrors;
}

async function findExistingTable(candidates: string[]): Promise<string | null> {
  const placeholders = candidates.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );

  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  return candidates.find((candidate) => existing.has(candidate)) ?? null;
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

async function ensureOtherSettingsTable(): Promise<string> {
  const columnSql = Object.entries(COLUMN_DEFINITIONS)
    .map(([column, definition]) => `\`${column}\` ${definition}`)
    .join(',\n      ');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${TABLE_NAME}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ${columnSql},
      INDEX idx_club_reader_other_settings_user_club (club_user_id, club_id)
    )
  `);

  const columns = await getTableColumns(TABLE_NAME);
  for (const [column, definition] of Object.entries(COLUMN_DEFINITIONS)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${TABLE_NAME}\` ADD COLUMN \`${column}\` ${definition}`
      );
    }
  }

  return TABLE_NAME;
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

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name
      FROM clubs_new
      WHERE id = ${requestedClubId}
        AND adminId = ${userId}
      LIMIT 1
    `;
    if (selected[0]) return selected[0];
  }

  const fallback = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name
    FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  return fallback[0] ?? null;
}

async function getAuthorizedContext(request: NextRequest) {
  const decoded = getTokenPayload(request);
  if (!decoded?.userId || !decoded.userType) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isClubAccountUserType(String(decoded.userType))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const userId = String(decoded.userId);
  const requestedClubId = request.nextUrl.searchParams.get('clubId');
  const club = await getOwnedClub(userId, requestedClubId);
  const legacyUserId = await getLegacyUserId(userId);
  const userIds = Array.from(new Set([userId, legacyUserId].filter(Boolean) as string[]));

  return { userId, legacyUserId, club, userIds };
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

async function fetchJsonSettings(context: AuthorizedContext) {
  const tableName = await findExistingTable([JSON_TABLE_NAME]);
  if (!tableName) return null;

  const columns = await getTableColumns(tableName);
  if (!columns.has('settings_json') || !columns.has('user_id')) return null;

  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const clubKey = context.club?.id ?? '';
  const clubFilter = columns.has('club_key') ? 'AND club_key = ?' : '';
  const modifiedOrder = columns.has('modified') ? 'modified DESC,' : '';
  const rows = await prisma.$queryRawUnsafe<{ settings_json: string }[]>(
    `SELECT settings_json
     FROM \`${tableName}\`
     WHERE user_id IN (${userPlaceholders})
       ${clubFilter}
     ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END, ${modifiedOrder} id DESC
     LIMIT 1`,
     ...context.userIds,
    ...(columns.has('club_key') ? [clubKey] : []),
    context.userId
  );

  return parseSavedJson(rows[0]?.settings_json);
}

async function fetchColumnSettings(tableName: string, context: AuthorizedContext): Promise<Record<string, unknown> | null> {
  const columns = await getTableColumns(tableName);
  const selectColumns = Object.values(SETTING_COLUMNS)
    .filter((column) => columns.has(column))
    .map((column) => `\`${column}\``);

  if (selectColumns.length === 0) return null;

  const orderBy = columns.has('modified')
    ? 'modified DESC'
    : columns.has('created')
      ? 'created DESC'
      : columns.has('id')
        ? 'id DESC'
        : '1 DESC';

  if (columns.has('club_user_id')) {
    const userPlaceholders = context.userIds.map(() => '?').join(',');
    if (columns.has('club_id') && context.club?.id) {
      const scopedRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${selectColumns.join(', ')}
         FROM \`${tableName}\`
         WHERE club_user_id IN (${userPlaceholders})
           AND club_id = ?
         ORDER BY ${orderBy}
         LIMIT 1`,
        ...context.userIds,
        context.club.id
      );
      if (scopedRows[0]) return scopedRows[0];
    }

    const userRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
      `SELECT ${selectColumns.join(', ')}
       FROM \`${tableName}\`
       WHERE club_user_id IN (${userPlaceholders})
       ORDER BY ${orderBy}
       LIMIT 1`,
      ...context.userIds
    );
    if (userRows[0]) return userRows[0];
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${selectColumns.join(', ')}
     FROM \`${tableName}\`
     ORDER BY ${orderBy}
     LIMIT 1`
  );

  return rows[0] ?? null;
}

function toColumnValue(key: string, value: string | boolean): string {
  const column = SETTING_COLUMNS[key];
  if (BOOLEAN_COLUMNS.has(column)) return value ? 'Y' : 'N';
  return String(value ?? '');
}

function buildColumnValues(settings: OtherSettings): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, column] of Object.entries(SETTING_COLUMNS)) {
    values[column] = toColumnValue(key, settings[key]);
  }

  values.document_logo = String(settings.printInDocument) === 'N'
    ? String(settings.documentLogo2 || '')
    : String(settings.documentLogo1 || '');
  values.path_sound = String(settings.pathSoundName || '');

  return values;
}

async function saveSettings(tableName: string, context: AuthorizedContext, settings: OtherSettings) {
  const columns = await getTableColumns(tableName);
  const values = buildColumnValues(settings);
  const clubId = context.club?.id ?? null;
  const storageUserId = context.legacyUserId ?? context.userId;
  const updateColumns = Object.keys(values).filter((column) => columns.has(column));
  const userPlaceholders = context.userIds.map(() => '?').join(',');
  const existing = await prisma.$queryRawUnsafe<{ id: string | number | bigint }[]>(
    `SELECT id
     FROM \`${tableName}\`
     WHERE club_user_id IN (${userPlaceholders})
       ${columns.has('club_id') && clubId ? 'AND club_id = ?' : ''}
     ORDER BY id DESC
     LIMIT 1`,
    ...context.userIds,
    ...(columns.has('club_id') && clubId ? [clubId] : [])
  );

  if (existing[0]) {
    const assignments = [
      ...(columns.has('club_id') ? ['club_id = ?'] : []),
      ...updateColumns.map((column) => `\`${column}\` = ?`),
      ...(columns.has('modified') ? ['modified = CURRENT_TIMESTAMP'] : [])
    ].join(', ');

    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET ${assignments}
       WHERE id = ?`,
      ...(columns.has('club_id') ? [clubId] : []),
      ...updateColumns.map((column) => values[column]),
      existing[0].id
    );
    return;
  }

  const insertColumns = [
    ...(columns.has('club_user_id') ? ['club_user_id'] : []),
    ...(columns.has('club_id') ? ['club_id'] : []),
    ...updateColumns
  ];
  const insertValues = [
    ...(columns.has('club_user_id') ? [storageUserId] : []),
    ...(columns.has('club_id') ? [clubId] : []),
    ...updateColumns.map((column) => values[column])
  ];
  const placeholders = insertColumns.map(() => '?').join(', ');

  await prisma.$executeRawUnsafe(
    `INSERT INTO \`${tableName}\`
       (${insertColumns.map((column) => `\`${column}\``).join(', ')})
     VALUES (${placeholders})`,
    ...insertValues
  );
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const tableName = await ensureOtherSettingsTable();
    const saved = await fetchColumnSettings(tableName, context);
    if (saved) {
      return NextResponse.json({
        club: context.club,
        settings: normalizeColumnSettings(saved),
        source: 'database'
      });
    }

    const json = await fetchJsonSettings(context);
    if (json) {
      return NextResponse.json({
        club: context.club,
        settings: normalizeSettings(json),
        source: 'json-fallback'
      });
    }

    return NextResponse.json({
      club: context.club,
      settings: DEFAULT_SETTINGS,
      source: 'default'
    });
  } catch (error) {
    console.error('GET /api/club/settings/other-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const body = await request.json();
    const settings = parseSettingsBody(body);
    const fieldErrors = validateSettings(settings);
    if (Object.keys(fieldErrors).length > 0) {
      return NextResponse.json({ error: 'Validation failed', fieldErrors }, { status: 400 });
    }

    const tableName = await ensureOtherSettingsTable();
    await saveSettings(tableName, context, settings);

    return NextResponse.json({
      success: true,
      club: context.club,
      settings
    });
  } catch (error) {
    console.error('PUT /api/club/settings/other-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
