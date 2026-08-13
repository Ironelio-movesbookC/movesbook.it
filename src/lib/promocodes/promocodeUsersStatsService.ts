import { prisma } from '@/lib/prisma';
import { getTableColumns } from '@/lib/outcomeSettingsDb';
import {
  fetchCountryCodeById,
  fetchFlagImageByCountryId,
  fetchLegacyUsersByIds,
  getLegacyUsersTable,
  getPromocodeAppliesTable,
  getPromocodeSettingsTable,
  getSubscriptionSettingsTable,
} from './legacyDb';
import { fetchModernUserCountries, findModernUserCountry } from './modernUserCountry';
import type { PaginatedResult, PromocodeUserRow } from './types';

function formatDate(value: unknown): string | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    const s = String(value).trim();
    return s.length >= 10 ? s.slice(0, 10) : s || null;
  }
  return d.toISOString().slice(0, 10);
}

function formatDateTime(value: unknown): string | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) {
    const s = String(value).trim();
    return s || null;
  }
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

const ROLE_NAMES: Record<number, string> = {
  1: 'Super Admin',
  2: 'Admin',
  5: 'Single User',
  6: 'Coach',
  7: 'Team',
  8: 'Club',
  9: 'Group',
};

function daysBetween(from: Date, to: Date): number {
  const ms = to.getTime() - from.getTime();
  return Math.max(0, Math.floor(ms / (24 * 60 * 60 * 1000)));
}

export async function listUsersOfPromocodes(params: {
  search?: string;
  page?: number;
  pageSize?: number;
}): Promise<PaginatedResult<PromocodeUserRow>> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
  const search = (params.search ?? '').trim();

  const appliesTable = await getPromocodeAppliesTable();
  const usersTable = await getLegacyUsersTable();
  const settingsTable = await getPromocodeSettingsTable();

  if (!appliesTable || !usersTable) {
    return { items: [], total: 0, page, pageSize };
  }

  const applyColumns = await getTableColumns(appliesTable);
  const userColumns = await getTableColumns(usersTable);
  if (!applyColumns.has('receiver_id')) {
    return { items: [], total: 0, page, pageSize };
  }

  const receiverRows = await prisma.$queryRawUnsafe<{ receiver_id: number | bigint }[]>(
    `SELECT DISTINCT receiver_id FROM \`${appliesTable}\`
     WHERE delete_status = 2 AND receiver_id > 0`
  );
  let receiverIds = Array.from(
    new Set(receiverRows.map((r) => Number(r.receiver_id)).filter((id) => id > 0))
  );

  if (receiverIds.length === 0) {
    return { items: [], total: 0, page, pageSize };
  }

  if (search) {
    const like = `%${search}%`;
    const nameCols: string[] = [];
    if (userColumns.has('username')) nameCols.push('username LIKE ?');
    if (userColumns.has('email')) nameCols.push('email LIKE ?');
    if (userColumns.has('firstname')) nameCols.push('firstname LIKE ?');
    if (userColumns.has('lastname')) nameCols.push('lastname LIKE ?');
    if (nameCols.length > 0) {
      const placeholders = receiverIds.map(() => '?').join(',');
      const searchParams: unknown[] = [...receiverIds];
      for (let i = 0; i < nameCols.length; i++) searchParams.push(like);
      const matched = await prisma.$queryRawUnsafe<{ id: number | bigint }[]>(
        `SELECT id FROM \`${usersTable}\`
         WHERE id IN (${placeholders}) AND (${nameCols.join(' OR ')})`,
        ...searchParams
      );
      receiverIds = matched.map((r) => Number(r.id)).filter((id) => id > 0);
    }
  }

  const total = receiverIds.length;
  if (total === 0) {
    return { items: [], total: 0, page, pageSize };
  }

  const offset = (page - 1) * pageSize;
  const pageIds = receiverIds.slice(offset, offset + pageSize);
  const users = await fetchLegacyUsersByIds(pageIds);

  const modernCountries = await fetchModernUserCountries(
    pageIds.map((id) => {
      const u = users.get(id);
      return { legacyId: id, email: u?.email ?? null, username: u?.username ?? null };
    })
  );

  const subTable = await getSubscriptionSettingsTable();
  let subNames = new Map<number, string>();
  if (subTable) {
    try {
      const subCols = await getTableColumns(subTable);
      const nameCol = subCols.has('subscription_name')
        ? 'subscription_name'
        : subCols.has('name')
          ? 'name'
          : null;
      if (nameCol) {
        const rows = await prisma.$queryRawUnsafe<{ id: number | bigint; name: string | null }[]>(
          `SELECT id, \`${nameCol}\` AS name FROM \`${subTable}\``
        );
        subNames = new Map(rows.map((r) => [Number(r.id), r.name ? String(r.name) : '']));
      }
    } catch {
      /* ignore */
    }
  }

  const settingsColumns = settingsTable ? await getTableColumns(settingsTable) : new Set<string>();
  const creatorCol = settingsColumns.has('creator_id')
    ? 'creator_id'
    : settingsColumns.has('creater_id')
      ? 'creater_id'
      : null;

  const items: PromocodeUserRow[] = [];
  const now = new Date();

  for (const id of pageIds) {
    const user = users.get(id);
    if (!user) continue;

    const modern = findModernUserCountry(modernCountries, {
      email: user.email,
      username: user.username,
    });
    const countryCode =
      modern?.countryCode ?? (await fetchCountryCodeById(user.countryId)) ?? null;
    const flagImage =
      !countryCode && user.countryId ? await fetchFlagImageByCountryId(user.countryId) : null;

    let firstPromocode: string | null = null;
    try {
      const firstRows = await prisma.$queryRawUnsafe<
        { code: string | null; created: unknown }[]
      >(
        settingsTable
          ? `SELECT ps.code, pa.created
             FROM \`${appliesTable}\` pa
             LEFT JOIN \`${settingsTable}\` ps ON ps.id = pa.promocode_id
             WHERE pa.receiver_id = ? AND pa.delete_status = 2
             ORDER BY pa.created ASC LIMIT 1`
          : `SELECT NULL AS code, created FROM \`${appliesTable}\`
             WHERE receiver_id = ? AND delete_status = 2
             ORDER BY created ASC LIMIT 1`,
        id
      );
      firstPromocode = firstRows[0]?.code != null ? String(firstRows[0].code) : null;
    } catch {
      firstPromocode = null;
    }

    let promocodesGenerated = 0;
    if (settingsTable && creatorCol) {
      try {
        const countRows = await prisma.$queryRawUnsafe<{ c: number | bigint }[]>(
          `SELECT COUNT(*) AS c FROM \`${settingsTable}\`
           WHERE \`${creatorCol}\` = ? AND delete_status = 2`,
          id
        );
        promocodesGenerated = Number(countRows[0]?.c ?? 0);
      } catch {
        promocodesGenerated = 0;
      }
    }

    let creditsEarned = 0;
    let creditsUsed = 0;
    try {
      if (applyColumns.has('sender_credit')) {
        const earnedRows = await prisma.$queryRawUnsafe<{ total: string | number | null }[]>(
          `SELECT COALESCE(SUM(CAST(sender_credit AS DECIMAL(12,2))), 0) AS total
           FROM \`${appliesTable}\`
           WHERE sender_id = ? AND delete_status = 2 AND receiver_id > 0`,
          id
        );
        creditsEarned = Number(earnedRows[0]?.total ?? 0) || 0;
      }
      if (applyColumns.has('secondary_sender_credit') && applyColumns.has('secondary_sender_id')) {
        const secRows = await prisma.$queryRawUnsafe<{ total: string | number | null }[]>(
          `SELECT COALESCE(SUM(CAST(secondary_sender_credit AS DECIMAL(12,2))), 0) AS total
           FROM \`${appliesTable}\`
           WHERE secondary_sender_id = ? AND delete_status = 2 AND receiver_id > 0`,
          id
        );
        creditsEarned += Number(secRows[0]?.total ?? 0) || 0;
      }
    } catch {
      /* ignore */
    }

    const creditsRemain = user.credits != null ? Number(user.credits) : 0;
    if (Number.isFinite(creditsRemain) && creditsEarned > creditsRemain) {
      creditsUsed = Math.max(0, creditsEarned - creditsRemain);
    }

    let lastInviteDate: string | null = null;
    let daysSinceLastInvite: number | null = null;
    try {
      const inviteRows = await prisma.$queryRawUnsafe<{ created: unknown }[]>(
        `SELECT created FROM \`${appliesTable}\`
         WHERE sender_id = ? AND delete_status = 2
         ORDER BY created DESC LIMIT 1`,
        id
      );
      if (inviteRows[0]?.created) {
        lastInviteDate = formatDateTime(inviteRows[0].created);
        const d = new Date(String(inviteRows[0].created));
        if (!Number.isNaN(d.getTime())) {
          daysSinceLastInvite = daysBetween(d, now);
        }
      }
    } catch {
      /* ignore */
    }

    let lastRegistrationDate: string | null = null;
    try {
      const regRows = await prisma.$queryRawUnsafe<{ created: unknown }[]>(
        `SELECT created FROM \`${appliesTable}\`
         WHERE sender_id = ? AND delete_status = 2 AND receiver_id > 0
         ORDER BY created DESC LIMIT 1`,
        id
      );
      if (regRows[0]?.created) {
        lastRegistrationDate = formatDateTime(regRows[0].created);
      }
    } catch {
      /* ignore */
    }

    const roleId = user.roleId != null ? Number(user.roleId) : 0;
    const versionId = user.subscriptionSettingId != null ? Number(user.subscriptionSettingId) : 0;

    items.push({
      legacyUserId: id,
      username: user.username ?? '',
      wholeName: [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || (user.username ?? ''),
      country: countryCode,
      countryCode,
      flagImage,
      userType: ROLE_NAMES[roleId] ?? (roleId ? `Role ${roleId}` : ''),
      version: versionId > 0 ? subNames.get(versionId) ?? null : null,
      expiration: formatDate(user.subscriptionEndDate),
      firstPromocode,
      promocodesGenerated,
      creditsEarned,
      creditsUsed,
      creditsRemain: Number.isFinite(creditsRemain) ? creditsRemain : 0,
      lastInviteDate,
      daysSinceLastInvite,
      lastRegistrationDate,
    });
  }

  return { items, total, page, pageSize };
}

export async function listInvitesAndRegistrationsForUser(legacyUserId: number) {
  const appliesTable = await getPromocodeAppliesTable();
  const settingsTable = await getPromocodeSettingsTable();
  if (!appliesTable || legacyUserId <= 0) return { invites: [], registrations: [] };

  const invites = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    settingsTable
      ? `SELECT pa.*, ps.code AS promocode_code
         FROM \`${appliesTable}\` pa
         LEFT JOIN \`${settingsTable}\` ps ON ps.id = pa.promocode_id
         WHERE pa.sender_id = ? AND pa.delete_status = 2
         ORDER BY pa.created DESC
         LIMIT 200`
      : `SELECT * FROM \`${appliesTable}\`
         WHERE sender_id = ? AND delete_status = 2
         ORDER BY created DESC LIMIT 200`,
    legacyUserId
  );

  const registrations = invites.filter((row) => {
    const rid = row.receiver_id != null ? Number(row.receiver_id) : 0;
    return rid > 0;
  });

  return { invites, registrations };
}

export async function listCreditsForUser(legacyUserId: number) {
  const appliesTable = await getPromocodeAppliesTable();
  if (!appliesTable || legacyUserId <= 0) {
    return { asSender: [], asSecondary: [] };
  }
  const cols = await getTableColumns(appliesTable);

  const asSender = cols.has('sender_credit')
    ? await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT * FROM \`${appliesTable}\`
         WHERE sender_id = ? AND delete_status = 2 AND receiver_id > 0
         ORDER BY created DESC LIMIT 200`,
        legacyUserId
      )
    : [];

  const asSecondary =
    cols.has('secondary_sender_id') && cols.has('secondary_sender_credit')
      ? await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
          `SELECT * FROM \`${appliesTable}\`
           WHERE secondary_sender_id = ? AND delete_status = 2 AND receiver_id > 0
           ORDER BY created DESC LIMIT 200`,
          legacyUserId
        )
      : [];

  return { asSender, asSecondary };
}
