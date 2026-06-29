import { UserType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { getTableColumns } from '@/lib/outcomeSettingsDb';
import { getLegacyUsersTable } from '@/lib/promocodes/legacyDb';

export type ClubMemberOption = { id: string; name: string };

const SINGLE_USER_LEGACY_ROLE_ID = 5;

function formatMemberName(user: {
  firstName: string | null;
  surname: string | null;
  name: string;
  username: string;
}): string {
  return [user.firstName, user.surname].filter(Boolean).join(' ').trim() || user.name || user.username;
}

function formatLegacyUserName(row: {
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
}): string {
  const full = [row.firstname, row.lastname].filter(Boolean).join(' ').trim();
  return full || String(row.username ?? '').trim();
}

async function resolveModernUserId(legacyUserId: number): Promise<string | null> {
  const legacyKey = `legacy_${legacyUserId}`;
  const direct = await prisma.user.findUnique({ where: { id: legacyKey }, select: { id: true } });
  if (direct) return direct.id;

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ new_id: string }[]>(
    `SELECT new_id
     FROM \`${mappingTable}\`
     WHERE legacy_table = 'users'
       AND legacy_id = ?
     LIMIT 1`,
    legacyUserId
  );
  return rows[0]?.new_id ?? null;
}

/** Movesbook single users (legacy role_id = 5), sorted alphabetically. */
export async function fetchSingleUserOptions(): Promise<ClubMemberOption[]> {
  const usersTable = await getLegacyUsersTable();
  const options: ClubMemberOption[] = [];
  const seenIds = new Set<string>();

  if (usersTable) {
    const columns = await getTableColumns(usersTable);
    if (columns.has('role_id')) {
      const firstNameSelect = columns.has('firstname') ? 'firstname' : "'' AS firstname";
      const lastNameSelect = columns.has('lastname')
        ? 'lastname'
        : columns.has('surname')
          ? 'surname AS lastname'
          : "'' AS lastname";
      const deleteFilter = columns.has('delete_status')
        ? "(delete_status IS NULL OR delete_status = 'N')"
        : '1=1';

      const rows = await prisma.$queryRawUnsafe<
        { id: number | bigint; username: string | null; firstname: string | null; lastname: string | null }[]
      >(
        `SELECT id, username, ${firstNameSelect}, ${lastNameSelect}
         FROM \`${usersTable}\`
         WHERE role_id = ?
           AND ${deleteFilter}`,
        SINGLE_USER_LEGACY_ROLE_ID
      );

      for (const row of rows) {
        const modernId = await resolveModernUserId(Number(row.id));
        if (!modernId || seenIds.has(modernId)) continue;
        const name = formatLegacyUserName(row);
        if (!name) continue;
        seenIds.add(modernId);
        options.push({ id: modernId, name });
      }
    }
  }

  if (options.length === 0) {
    const users = await prisma.user.findMany({
      where: { userType: UserType.ATHLETE },
      select: { id: true, firstName: true, surname: true, name: true, username: true },
    });
    for (const user of users) {
      if (seenIds.has(user.id)) continue;
      const name = formatMemberName(user);
      if (!name) continue;
      seenIds.add(user.id);
      options.push({ id: user.id, name });
    }
  }

  options.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return options;
}

/** Club members for procedure input forms (sorted by name). */
export async function fetchClubMemberOptions(clubId: string): Promise<ClubMemberOption[]> {
  const clubMembers = await prisma.clubMember.findMany({
    where: { clubId },
    include: {
      member: {
        select: { id: true, name: true, firstName: true, surname: true, username: true },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const members: ClubMemberOption[] = [];
  for (const cm of clubMembers) {
    const name = formatMemberName(cm.member);
    if (!name) continue;
    members.push({ id: cm.member.id, name });
  }

  members.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
  return members;
}

/**
 * Customers shown on procedure forms.
 * Uses club members when available; otherwise falls back to Movesbook single users (role_id = 5).
 */
export async function fetchProcedureCustomerOptions(clubId: string): Promise<ClubMemberOption[]> {
  const clubMembers = await fetchClubMemberOptions(clubId);
  if (clubMembers.length > 0) return clubMembers;
  return fetchSingleUserOptions();
}
