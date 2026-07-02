import { prisma } from '@/lib/prisma';
import { countryCodeFromName } from '@/lib/admin/countryFlag';
import { findExistingTable } from '@/lib/outcomeSettingsDb';

export type ModernUserCountry = {
  country: string;
  countryCode: string;
};

type Identity = {
  legacyId?: number | null;
  email?: string | null;
  username?: string | null;
};

function norm(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

async function getNextUsersTable(): Promise<string | null> {
  return findExistingTable(['users_new', 'users']);
}

export async function fetchModernUserCountries(
  identities: Identity[]
): Promise<{
  byEmail: Map<string, ModernUserCountry>;
  byUsername: Map<string, ModernUserCountry>;
  byLegacyId: Map<string, ModernUserCountry>;
}> {
  const emails = Array.from(new Set(identities.map((i) => norm(i.email)).filter((v) => v.includes('@'))));
  const usernames = Array.from(new Set(identities.map((i) => norm(i.username)).filter(Boolean)));
  const legacyIds = Array.from(
    new Set(
      identities
        .map((i) => (i.legacyId != null && Number.isFinite(i.legacyId) ? `legacy_${i.legacyId}` : ''))
        .filter(Boolean)
    )
  );

  const byEmail = new Map<string, ModernUserCountry>();
  const byUsername = new Map<string, ModernUserCountry>();
  const byLegacyId = new Map<string, ModernUserCountry>();
  if (emails.length === 0 && usernames.length === 0 && legacyIds.length === 0) {
    return { byEmail, byUsername, byLegacyId };
  }

  const usersTable = await getNextUsersTable();
  if (!usersTable) return { byEmail, byUsername, byLegacyId };

  const whereParts: string[] = [];
  const params: unknown[] = [];

  if (emails.length > 0) {
    whereParts.push(`LOWER(email) IN (${emails.map(() => '?').join(',')})`);
    params.push(...emails);
  }
  if (usernames.length > 0) {
    whereParts.push(`LOWER(username) IN (${usernames.map(() => '?').join(',')})`);
    params.push(...usernames);
  }
  if (legacyIds.length > 0) {
    whereParts.push(`id IN (${legacyIds.map(() => '?').join(',')})`);
    params.push(...legacyIds);
  }

  const rows = await prisma.$queryRawUnsafe<
    { id: string | null; email: string | null; username: string | null; country: string | null }[]
  >(
    `SELECT id, email, username, country FROM \`${usersTable}\` WHERE ${whereParts.join(' OR ')}`,
    ...params
  ).catch(() => [] as { id: string | null; email: string | null; username: string | null; country: string | null }[]);

  for (const row of rows) {
    const country = row.country?.trim() ?? '';
    const countryCode = countryCodeFromName(country);
    if (!countryCode) continue;

    const value = { country, countryCode };
    const email = norm(row.email);
    const username = norm(row.username);
    const legacyId = row.id?.startsWith('legacy_') ? row.id : '';
    if (email) byEmail.set(email, value);
    if (username) byUsername.set(username, value);
    if (legacyId) byLegacyId.set(legacyId, value);
  }

  return { byEmail, byUsername, byLegacyId };
}

export function findModernUserCountry(
  maps: {
    byEmail: Map<string, ModernUserCountry>;
    byUsername: Map<string, ModernUserCountry>;
    byLegacyId?: Map<string, ModernUserCountry>;
  },
  identity: Identity
): ModernUserCountry | null {
  if (identity.legacyId != null && maps.byLegacyId?.has(`legacy_${identity.legacyId}`)) {
    return maps.byLegacyId.get(`legacy_${identity.legacyId}`) ?? null;
  }

  const email = norm(identity.email);
  if (email && maps.byEmail.has(email)) return maps.byEmail.get(email) ?? null;

  const username = norm(identity.username);
  if (username && maps.byUsername.has(username)) return maps.byUsername.get(username) ?? null;

  return null;
}
