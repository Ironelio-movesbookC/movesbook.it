import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';

function formatUserName(user: {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
}): string {
  return [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;
}

function normalizeOccupation(value: string | null | undefined): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export type OperatorOption = { id: string; name: string };

export type StaffOperatorOption = OperatorOption & {
  /** Employment occupation from Staff\\Operators (ClubSettingEmpOccupation). */
  occupation: string;
  username: string;
};

/** Staff occupations allowed in the member-profile Coach dropdown. */
export function isCoachStaffOccupation(value: string | null | undefined): boolean {
  const n = normalizeOccupation(value);
  if (!n) return false;
  if (n === 'instructor' || n === 'instructors') return true;
  if (n === 'personal trainer' || n === 'personal trainers') return true;
  // Legacy PHP sometimes stores "Personal trainer" (lowercase t).
  if (n.startsWith('personal trainer')) return true;
  return false;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    tableName,
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

/**
 * Staff\\Operators list for a club — same source as legacy `clubs/club_operator_list`
 * joined with employment occupation (`club_setting_emp_occupations`).
 */
export async function fetchClubStaffOperators(clubId: string): Promise<StaffOperatorOption[]> {
  const staff: StaffOperatorOption[] = [];
  const seen = new Set<string>();

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { adminId: true },
  });
  const adminId = club?.adminId ? String(club.adminId) : '';
  if (!adminId) return staff;

  const operatorTable = await findExistingTable(['club_operators', 'club_operator']);
  const accessTable = await findExistingTable([
    'club_operator_assign_access_levels',
    'club_operator_assign_access_level',
  ]);
  const occupationTable = await findExistingTable([
    'club_setting_emp_occupations',
    'club_setting_emp_occupation',
  ]);

  type StaffRow = {
    operator_id: string | number | bigint | null;
    firstName: string | null;
    surname: string | null;
    name: string | null;
    username: string | null;
    occupation: string | null;
  };

  const pushRow = (row: StaffRow) => {
    const id = String(row.operator_id ?? '').trim();
    if (!id || seen.has(id)) return;
    const username = String(row.username ?? '').trim();
    const name = formatUserName({
      firstName: row.firstName,
      surname: row.surname,
      name: row.name || '',
      username: username || id,
    });
    if (!name) return;
    staff.push({
      id,
      name,
      username: username || name,
      occupation: String(row.occupation ?? '').trim(),
    });
    seen.add(id);
  };

  // Primary: club_operators (Staff\\Operators archive) + assign access + occupation.
  if (operatorTable) {
    const opCols = await getTableColumns(operatorTable);
    const adminCol = opCols.has('clubadmin_id') ? 'clubadmin_id' : null;
    const userCol = opCols.has('user_id') ? 'user_id' : null;

    if (adminCol && userCol) {
      try {
        if (accessTable && occupationTable) {
          const rows = await prisma.$queryRawUnsafe<StaffRow[]>(
            `SELECT co.${userCol} AS operator_id,
                    u.firstName,
                    u.surname,
                    u.name,
                    u.username,
                    o.occupation
             FROM \`${operatorTable}\` co
             INNER JOIN users u ON u.id = co.${userCol}
             LEFT JOIN \`${accessTable}\` a
               ON a.operator_id = co.${userCol}
              AND a.clubuser_id = ?
             LEFT JOIN \`${occupationTable}\` o ON o.id = a.employee_id
             WHERE co.${adminCol} = ?
             ORDER BY u.username ASC`,
            adminId,
            adminId,
          );
          for (const row of rows) pushRow(row);
        } else {
          const rows = await prisma.$queryRawUnsafe<StaffRow[]>(
            `SELECT co.${userCol} AS operator_id,
                    u.firstName,
                    u.surname,
                    u.name,
                    u.username,
                    '' AS occupation
             FROM \`${operatorTable}\` co
             INNER JOIN users u ON u.id = co.${userCol}
             WHERE co.${adminCol} = ?
             ORDER BY u.username ASC`,
            adminId,
          );
          for (const row of rows) pushRow(row);
        }
      } catch {
        // Schema variant — try assign-access-only query below.
      }
    }
  }

  // Fallback when club_operators is missing but assign-access rows exist (imported legacy data).
  if (staff.length === 0 && accessTable && occupationTable) {
    try {
      const rows = await prisma.$queryRawUnsafe<StaffRow[]>(
        `SELECT a.operator_id,
                u.firstName,
                u.surname,
                u.name,
                u.username,
                o.occupation
         FROM \`${accessTable}\` a
         INNER JOIN \`${occupationTable}\` o ON o.id = a.employee_id
         INNER JOIN users u ON u.id = a.operator_id
         WHERE a.clubuser_id = ?
           AND a.operator_id IS NOT NULL
           AND CAST(a.operator_id AS CHAR) <> '0'
         ORDER BY u.username ASC`,
        adminId,
      );
      for (const row of rows) pushRow(row);
    } catch {
      // No legacy staff tables available.
    }
  }

  staff.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return staff;
}

/** Operators selectable on procedure forms (club admin + staff members). */
export async function fetchClubOperatorOptions(clubId: string): Promise<OperatorOption[]> {
  const operators: OperatorOption[] = [];
  const seen = new Set<string>();

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: {
      admin: {
        select: { id: true, firstName: true, surname: true, name: true, username: true },
      },
    },
  });

  if (club?.admin) {
    operators.push({ id: club.admin.id, name: formatUserName(club.admin) });
    seen.add(club.admin.id);
  }

  const staffMembers = await prisma.clubStaff.findMany({
    where: { clubId },
    include: {
      user: {
        select: { id: true, firstName: true, surname: true, name: true, username: true },
      },
    },
  });

  for (const row of staffMembers) {
    if (seen.has(row.user.id)) continue;
    const name = formatUserName(row.user);
    if (!name) continue;
    operators.push({ id: row.user.id, name });
    seen.add(row.user.id);
  }

  operators.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return operators;
}

/**
 * Coach dropdown: Staff\\Operators filtered to Instructors and Personal Trainers only.
 */
export async function fetchClubCoachOptions(clubId: string): Promise<OperatorOption[]> {
  const staff = await fetchClubStaffOperators(clubId);
  return staff
    .filter((row) => isCoachStaffOccupation(row.occupation))
    .map(({ id, name }) => ({ id, name }));
}
