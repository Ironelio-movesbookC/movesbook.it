import { prisma } from '@/lib/prisma';
import { getTableColumns } from '@/lib/outcomeSettingsDb';
import {
  fetchCountryCodeById,
  fetchFlagImageByCountryId,
  fetchLegacyUsersByIds,
  getCountriesTable,
  getLegacyUsersTable,
  getPromocodeAppliesTable,
} from '@/lib/promocodes/legacyDb';
import { fetchModernUserCountries, findModernUserCountry } from '@/lib/promocodes/modernUserCountry';

export type CreditsEarnedRow = {
  id: number;
  username: string;
  typeOfUser: string;
  country: string;
  countryCode: string | null;
  flagImg: string | null;
  creditsTotal: number;
  used: number;
  available: number;
  primaryUsername: string;
  secondaryUsernames: string[];
  secondaryCount: number;
};

const ROLE_NAMES: Record<number, string> = {
  1: 'Super Admin',
  2: 'Admin',
  5: 'Single User',
  6: 'Coach',
  7: 'Team',
  8: 'Club',
  9: 'Group',
};

export async function listCreditsEarnedUsers(searchUsername = ''): Promise<CreditsEarnedRow[]> {
  const appliesTable = await getPromocodeAppliesTable();
  const usersTable = await getLegacyUsersTable();
  if (!appliesTable || !usersTable) return [];

  const applyColumns = await getTableColumns(appliesTable);
  const userColumns = await getTableColumns(usersTable);

  const senderRows = applyColumns.has('sender_id')
    ? await prisma.$queryRawUnsafe<{ sender_id: number | bigint }[]>(
        `SELECT DISTINCT sender_id FROM \`${appliesTable}\`
         WHERE delete_status = 2 AND sender_id > 0`
      )
    : [];
  const secondaryRows = applyColumns.has('secondary_sender_id')
    ? await prisma.$queryRawUnsafe<{ secondary_sender_id: number | bigint }[]>(
        `SELECT DISTINCT secondary_sender_id FROM \`${appliesTable}\`
         WHERE delete_status = 2 AND secondary_sender_id > 0`
      )
    : [];

  const earningUserIds = Array.from(
    new Set([
      ...senderRows.map((r) => Number(r.sender_id)).filter((id) => id > 0),
      ...secondaryRows.map((r) => Number(r.secondary_sender_id)).filter((id) => id > 0),
    ])
  );

  if (earningUserIds.length === 0) return [];

  const placeholders = earningUserIds.map(() => '?').join(',');
  const creditsSelect = userColumns.has('credits') ? 'credits' : '0 AS credits';
  const emailSelect = userColumns.has('email') ? 'email' : "'' AS email";
  let userSql = `SELECT id, username, email, role_id, country_id, ${creditsSelect}
                 FROM \`${usersTable}\`
                 WHERE id IN (${placeholders}) AND delete_status = 'N'`;
  const userParams: unknown[] = [...earningUserIds];

  if (searchUsername.trim()) {
    userSql += ' AND username LIKE ?';
    userParams.push(`%${searchUsername.trim()}%`);
  }
  userSql += ' ORDER BY username ASC';

  const users = await prisma.$queryRawUnsafe<
    {
      id: number | bigint;
      username: string | null;
      email: string | null;
      role_id: number | null;
      country_id: number | null;
      credits: number | string | null;
    }[]
  >(userSql.replace('username, email,', `username, ${emailSelect},`), ...userParams);

  const modernUserCountries = await fetchModernUserCountries(
    users.map((u) => ({ legacyId: Number(u.id), email: u.email, username: u.username }))
  );

  const rows: CreditsEarnedRow[] = [];

  for (const u of users) {
    const uid = Number(u.id);
    const sumSender =
      applyColumns.has('sender_id') && applyColumns.has('sender_credit')
        ? await prisma.$queryRawUnsafe<{ total_sender: number | string | null }[]>(
            `SELECT COALESCE(SUM(CAST(sender_credit AS DECIMAL(12,2))), 0) AS total_sender
             FROM \`${appliesTable}\`
             WHERE delete_status = 2 AND sender_id = ?`,
            uid
          )
        : [{ total_sender: 0 }];
    const sumSecondary =
      applyColumns.has('secondary_sender_id') && applyColumns.has('secondary_sender_credit')
        ? await prisma.$queryRawUnsafe<{ total_secondary: number | string | null }[]>(
            `SELECT COALESCE(SUM(CAST(secondary_sender_credit AS DECIMAL(12,2))), 0) AS total_secondary
             FROM \`${appliesTable}\`
             WHERE delete_status = 2 AND secondary_sender_id = ?`,
            uid
          )
        : [{ total_secondary: 0 }];

    const senderEarned = Number(sumSender[0]?.total_sender ?? 0);
    const secondaryEarned = Number(sumSecondary[0]?.total_secondary ?? 0);
    const totalEarned = senderEarned + secondaryEarned;

    // Legacy users.credits is incremented when someone registers with a promocode.
    // Product purchase deduction is not implemented yet, so a zero balance here usually
    // means the ledger was not synced — not that everything was spent.
    const legacyBalance = userColumns.has('credits') ? Number(u.credits ?? 0) : 0;
    const available = legacyBalance > 0 ? legacyBalance : totalEarned;
    let used = totalEarned - available;
    if (used < 0) used = 0;

    const primaryApply =
      applyColumns.has('receiver_id') && applyColumns.has('sender_id')
        ? await prisma.$queryRawUnsafe<
            { sender_id: number | null; sender_email: string | null }[]
          >(
            `SELECT sender_id, sender_email FROM \`${appliesTable}\`
             WHERE delete_status = 2 AND receiver_id = ?
             ORDER BY id DESC LIMIT 1`,
            uid
          )
        : [];
    let primaryUsername = '';
    const pa = primaryApply[0];
    if (pa?.sender_id) {
      const pu = await fetchLegacyUsersByIds([Number(pa.sender_id)]);
      primaryUsername = pu.get(Number(pa.sender_id))?.username ?? '';
    } else if (pa?.sender_email) {
      const byEmail = await prisma.$queryRawUnsafe<{ username: string | null }[]>(
        `SELECT username FROM \`${usersTable}\` WHERE LOWER(email) = ? LIMIT 1`,
        pa.sender_email.trim().toLowerCase()
      );
      primaryUsername = byEmail[0]?.username ?? '';
    }

    const secondaryApplies =
      applyColumns.has('secondary_sender_id') && applyColumns.has('receiver_id')
        ? await prisma.$queryRawUnsafe<
            { receiver_id: number | null; receiver_email: string | null }[]
          >(
            `SELECT receiver_id, receiver_email FROM \`${appliesTable}\`
             WHERE delete_status = 2 AND secondary_sender_id = ?`,
            uid
          )
        : [];
    const secondaryNamesMap = new Map<string, boolean>();
    for (const sr of secondaryApplies) {
      if (sr.receiver_id && Number(sr.receiver_id) > 0) {
        const ru = await fetchLegacyUsersByIds([Number(sr.receiver_id)]);
        const uname = ru.get(Number(sr.receiver_id))?.username;
        if (uname) secondaryNamesMap.set(uname, true);
      } else if (sr.receiver_email) {
        secondaryNamesMap.set(sr.receiver_email.trim(), true);
      }
    }
    const secondaryUsernames = Array.from(secondaryNamesMap.keys()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    const countryId = u.country_id != null ? Number(u.country_id) : null;
    const flagImg = await fetchFlagImageByCountryId(countryId);
    const legacyCountryCode = await fetchCountryCodeById(countryId);
    let countryName = '';
    const countriesTable = await getCountriesTable();
    if (countriesTable && countryId) {
      const cRows = await prisma.$queryRawUnsafe<{ name: string | null }[]>(
        `SELECT name FROM \`${countriesTable}\` WHERE id = ? LIMIT 1`,
        countryId
      );
      countryName = cRows[0]?.name ?? '';
    }
    const modernCountry = findModernUserCountry(modernUserCountries, {
      legacyId: uid,
      email: u.email,
      username: u.username,
    });
    const countryCode = modernCountry?.countryCode ?? legacyCountryCode;
    if (modernCountry?.country) {
      countryName = modernCountry.country;
    }
    const resolvedFlagImg = modernCountry ? null : flagImg;

    rows.push({
      id: uid,
      username: u.username ?? '',
      typeOfUser: u.role_id != null ? ROLE_NAMES[Number(u.role_id)] ?? String(u.role_id) : '',
      country: countryName,
      countryCode,
      flagImg: resolvedFlagImg,
      creditsTotal: totalEarned,
      used,
      available,
      primaryUsername,
      secondaryUsernames,
      secondaryCount: secondaryUsernames.length,
    });
  }

  return rows;
}
