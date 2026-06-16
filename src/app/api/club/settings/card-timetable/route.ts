import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  buildTimetableDbValues,
  createEmptyTimetableForm,
  mapDbRowToTimetableForm,
  text,
  type TimetableBookingSettings
} from '@/lib/clubCardTimetable';

export const dynamic = 'force-dynamic';

const TIMETABLE_TABLE_CANDIDATES = ['club_card_timetables', 'club_card_timetable'];
const TYPOLOGY_TABLE_CANDIDATES = [
  'club_setting_subscription_typologies',
  'club_setting_subscription_typology'
];
const OPERATOR_TABLE_CANDIDATES = ['club_operators', 'club_operator'];

type AuthorizedContext = {
  userId: string;
  club: { id: string; name: string } | null;
  userIds: string[];
};

function yesNo(value: unknown): boolean {
  return value === 'Y' || value === 'y' || value === true || value === 1 || value === '1';
}

/** Legacy CakePHP stores lesson cost as `cost_for_lesson`; some schemas use `cost`. */
function resolveCostColumn(columns: Set<string>): 'cost_for_lesson' | 'cost' | null {
  if (columns.has('cost_for_lesson')) return 'cost_for_lesson';
  if (columns.has('cost')) return 'cost';
  return null;
}

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
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

async function ensureLocalTimetableTable(): Promise<string> {
  const tableName = 'club_card_timetables';
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${tableName}\` (
      id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      typology_message_id VARCHAR(191) NOT NULL,
      subscription_id VARCHAR(191) NOT NULL DEFAULT '0',
      am_time TEXT NOT NULL,
      pm_time TEXT NOT NULL,
      rangValue TEXT NOT NULL,
      from_start TEXT NULL,
      bookabled TEXT NULL,
      maxnumber TEXT NULL,
      payable TEXT NULL,
      instructor TEXT NULL,
      setbook TEXT NULL,
      enabled TEXT NULL,
      permit_minute_access INT NULL,
      blocking_minute_access INT NULL,
      reserve_maxnumber VARCHAR(20) DEFAULT '5',
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_card_timetable_user_typology (user_id, typology_message_id)
    )
  `);
  return tableName;
}

async function ensureTimetableColumns(tableName: string): Promise<void> {
  const columns = await getTableColumns(tableName);
  const additions: Record<string, string> = {
    from_start: 'ADD COLUMN `from_start` TEXT NULL',
    bookabled: 'ADD COLUMN `bookabled` TEXT NULL',
    maxnumber: 'ADD COLUMN `maxnumber` TEXT NULL',
    payable: 'ADD COLUMN `payable` TEXT NULL',
    instructor: 'ADD COLUMN `instructor` TEXT NULL',
    setbook: 'ADD COLUMN `setbook` TEXT NULL',
    enabled: 'ADD COLUMN `enabled` TEXT NULL',
    reserve_maxnumber: 'ADD COLUMN `reserve_maxnumber` VARCHAR(20) DEFAULT \'5\''
  };

  for (const [column, clause] of Object.entries(additions)) {
    if (!columns.has(column)) {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`${tableName}\` ${clause}`);
    }
  }
}

async function getTimetableTableForRead(): Promise<string> {
  const existing = await findExistingTable(TIMETABLE_TABLE_CANDIDATES);
  const tableName = existing ?? (await ensureLocalTimetableTable());
  await ensureTimetableColumns(tableName);
  return tableName;
}

async function getTimetableTableForWrite(): Promise<string> {
  return getTimetableTableForRead();
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

  return { userId, club, userIds };
}

async function fetchTypologyOptions(userIds: string[], clubId: string | null) {
  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) return [];

  const userPlaceholders = userIds.map(() => '?').join(',');
  const columns = await getTableColumns(typologyTable);
  const clubFilter = clubId && columns.has('club_id') ? ' AND club_id = ?' : '';

  const rows = await prisma.$queryRawUnsafe<{ id: string | number; activity_name: string | null }[]>(
    `SELECT id, activity_name
     FROM \`${typologyTable}\`
     WHERE user_id IN (${userPlaceholders})
       ${clubFilter}
     ORDER BY id DESC`,
    ...userIds,
    ...(clubFilter ? [clubId] : [])
  );

  return rows.map((row) => ({
    id: String(row.id),
    name: text(row.activity_name) || `Typology ${row.id}`
  }));
}

async function fetchImportSources(
  userIds: string[],
  excludeTypologyId: string
): Promise<{ id: string; name: string }[]> {
  const tableName = await getTimetableTableForRead();
  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) return [];

  const userPlaceholders = userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ typology_message_id: string | number; activity_name: string | null }[]>(
    `SELECT DISTINCT t.typology_message_id, ty.activity_name
     FROM \`${tableName}\` t
     INNER JOIN \`${typologyTable}\` ty ON ty.id = t.typology_message_id
     WHERE t.user_id IN (${userPlaceholders})
       AND t.typology_message_id != ?
     ORDER BY ty.activity_name ASC`,
    ...userIds,
    excludeTypologyId
  );

  return rows.map((row) => ({
    id: String(row.typology_message_id),
    name: text(row.activity_name) || `Typology ${row.typology_message_id}`
  }));
}

async function fetchOperators(userIds: string[]): Promise<{ id: string; name: string }[]> {
  const operatorTable = await findExistingTable(OPERATOR_TABLE_CANDIDATES);
  if (!operatorTable) return [];

  const columns = await getTableColumns(operatorTable);
  if (!columns.has('clubadmin_id')) return [];

  const userPlaceholders = userIds.map(() => '?').join(',');
  const hasUserJoin = columns.has('user_id');

  if (hasUserJoin) {
    const userTable = await findExistingTable(['users']);
    if (userTable) {
      const userCols = await getTableColumns(userTable);
      const firstNameCol = userCols.has('firstname') ? 'firstname' : userCols.has('firstName') ? 'firstName' : null;
      const lastNameCol = userCols.has('lastname') ? 'lastname' : userCols.has('lastName') ? 'lastName' : null;
      if (firstNameCol && lastNameCol) {
        const rows = await prisma.$queryRawUnsafe<{ id: string | number; name: string | null }[]>(
          `SELECT u.id,
                  TRIM(CONCAT(COALESCE(u.\`${firstNameCol}\`, ''), ' ', COALESCE(u.\`${lastNameCol}\`, ''))) AS name
           FROM \`${operatorTable}\` o
           INNER JOIN \`${userTable}\` u ON u.id = o.user_id
           WHERE o.clubadmin_id IN (${userPlaceholders})
           ORDER BY u.\`${lastNameCol}\` ASC`,
          ...userIds
        );
        return rows.map((row) => ({
          id: String(row.id),
          name: text(row.name) || `Operator ${row.id}`
        }));
      }
    }
  }

  return [];
}

async function fetchTypologyMeta(typologyId: string, userIds: string[]) {
  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) {
    return {
      editable: false,
      bookingSettings: {} as Partial<TimetableBookingSettings>
    };
  }

  const columns = await getTableColumns(typologyTable);
  const userPlaceholders = userIds.map(() => '?').join(',');
  const selectParts = ['id'];
  if (columns.has('editable_subscription_timetable')) {
    selectParts.push('editable_subscription_timetable');
  }
  if (columns.has('enabled_for_booking')) selectParts.push('enabled_for_booking');
  if (columns.has('payment_posteciped_or_credit_card')) {
    selectParts.push('payment_posteciped_or_credit_card');
  }
  if (columns.has('pay_within_days')) selectParts.push('pay_within_days');
  const costColumn = resolveCostColumn(columns);
  if (costColumn) selectParts.push(costColumn);

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT ${selectParts.join(', ')}
     FROM \`${typologyTable}\`
     WHERE id = ?
       AND user_id IN (${userPlaceholders})
     LIMIT 1`,
    typologyId,
    ...userIds
  );

  const row = rows[0];
  if (!row) {
    return {
      editable: false,
      bookingSettings: {} as Partial<TimetableBookingSettings>
    };
  }

  return {
    editable: yesNo(row.editable_subscription_timetable),
    bookingSettings: {
      enabledForBooking: row.enabled_for_booking == null ? true : yesNo(row.enabled_for_booking),
      paymentPostecipedOrCreditCard: yesNo(row.payment_posteciped_or_credit_card),
      payWithinDays: row.pay_within_days != null ? String(row.pay_within_days) : '',
      cost: costColumn && row[costColumn] != null ? String(row[costColumn]) : ''
    } as Partial<TimetableBookingSettings>
  };
}

async function fetchTimetableRow(
  typologyId: string,
  userIds: string[]
): Promise<Record<string, unknown> | null> {
  const tableName = await getTimetableTableForRead();
  const userPlaceholders = userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT *
     FROM \`${tableName}\`
     WHERE typology_message_id = ?
       AND user_id IN (${userPlaceholders})
     ORDER BY id DESC
     LIMIT 1`,
    typologyId,
    ...userIds
  );

  return rows[0] ?? null;
}

async function updateTypologyFlags(
  typologyId: string,
  userIds: string[],
  editable: boolean,
  bookingSettings?: TimetableBookingSettings
): Promise<void> {
  const typologyTable = await findExistingTable(TYPOLOGY_TABLE_CANDIDATES);
  if (!typologyTable) return;

  const columns = await getTableColumns(typologyTable);
  const userPlaceholders = userIds.map(() => '?').join(',');
  const updates: string[] = [];
  const values: unknown[] = [];

  if (columns.has('editable_subscription_timetable')) {
    updates.push('editable_subscription_timetable = ?');
    values.push(editable ? 'Y' : 'N');
  }

  if (bookingSettings) {
    if (columns.has('enabled_for_booking')) {
      updates.push('enabled_for_booking = ?');
      values.push(bookingSettings.enabledForBooking ? 'Y' : 'N');
    }
    if (columns.has('payment_posteciped_or_credit_card')) {
      updates.push('payment_posteciped_or_credit_card = ?');
      values.push(bookingSettings.paymentPostecipedOrCreditCard ? 'Y' : 'N');
    }
    if (columns.has('pay_within_days')) {
      updates.push('pay_within_days = ?');
      values.push(bookingSettings.payWithinDays || null);
    }
    const costColumn = resolveCostColumn(columns);
    if (costColumn) {
      updates.push(`${costColumn} = ?`);
      values.push(bookingSettings.cost || null);
    }
  }

  if (updates.length === 0) return;

  await prisma.$executeRawUnsafe(
    `UPDATE \`${typologyTable}\`
     SET ${updates.join(', ')}
     WHERE id = ?
       AND user_id IN (${userPlaceholders})`,
    ...values,
    typologyId,
    ...userIds
  );
}

export async function GET(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const typologyId = request.nextUrl.searchParams.get('typologyId') ?? '';
    const copyFromId = request.nextUrl.searchParams.get('copyFrom') ?? '';
    const listImport = request.nextUrl.searchParams.get('listImport') === '1';
    const typologies = await fetchTypologyOptions(context.userIds, context.club?.id ?? null);
    const operators = await fetchOperators(context.userIds);

    if (!typologyId) {
      return NextResponse.json({
        club: context.club,
        typologies,
        operators,
        importSources: [],
        timetable: null
      });
    }

    const loadTypologyId = copyFromId || typologyId;
    const meta = await fetchTypologyMeta(typologyId, context.userIds);
    const row = await fetchTimetableRow(loadTypologyId, context.userIds);
    const timetable = row
      ? mapDbRowToTimetableForm(row, typologyId, meta.editable, meta.bookingSettings)
      : { ...createEmptyTimetableForm(typologyId), editableSubscriptionTimetable: meta.editable, bookingSettings: {
          enabledForBooking: meta.bookingSettings.enabledForBooking ?? true,
          paymentPostecipedOrCreditCard: meta.bookingSettings.paymentPostecipedOrCreditCard ?? false,
          payWithinDays: meta.bookingSettings.payWithinDays ?? '',
          cost: meta.bookingSettings.cost ?? ''
        } };

    if (copyFromId && row) {
      timetable.id = null;
      timetable.typologyId = typologyId;
    }

    const importSources = listImport || copyFromId
      ? await fetchImportSources(context.userIds, typologyId)
      : await fetchImportSources(context.userIds, typologyId);

    return NextResponse.json({
      club: context.club,
      typologies,
      operators,
      importSources,
      timetable
    });
  } catch (error) {
    console.error('GET /api/club/settings/card-timetable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getAuthorizedContext(request);
    if ('error' in context) return context.error;

    const body = await request.json();
    const typologyId = text(body.typologyId);
    if (!typologyId || typologyId.startsWith('local-')) {
      return NextResponse.json({ error: 'Invalid typology id' }, { status: 400 });
    }

    const tableName = await getTimetableTableForWrite();
    const columns = await getTableColumns(tableName);
    const userId = context.userIds[context.userIds.length - 1] ?? context.userId;
    const values = buildTimetableDbValues(body);
    values.user_id = userId;

    await updateTypologyFlags(
      typologyId,
      context.userIds,
      Boolean(body.editableSubscriptionTimetable),
      body.bookingSettings
    );

    const existing = await fetchTimetableRow(typologyId, context.userIds);
    const dbValues = Object.fromEntries(
      Object.entries(values).filter(([column, value]) => columns.has(column) && value != null)
    );

    if (existing?.id != null) {
      const updateColumns = Object.keys(dbValues).filter((column) => column !== 'user_id');
      if (updateColumns.length > 0) {
        await prisma.$executeRawUnsafe(
          `UPDATE \`${tableName}\`
           SET ${updateColumns.map((column) => `\`${column}\` = ?`).join(', ')}
           WHERE id = ?`,
          ...updateColumns.map((column) => dbValues[column]),
          existing.id
        );
      }
      return NextResponse.json({ success: true, id: String(existing.id) });
    }

    const insertColumns = Object.keys(dbValues);
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${tableName}\`
         (${insertColumns.map((column) => `\`${column}\``).join(', ')})
       VALUES (${insertColumns.map(() => '?').join(', ')})`,
      ...insertColumns.map((column) => dbValues[column])
    );

    const idRows = await prisma.$queryRawUnsafe<{ id: bigint | number | string }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );

    return NextResponse.json({
      success: true,
      id: idRows[0]?.id != null ? String(idRows[0].id) : null
    });
  } catch (error) {
    console.error('POST /api/club/settings/card-timetable:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
