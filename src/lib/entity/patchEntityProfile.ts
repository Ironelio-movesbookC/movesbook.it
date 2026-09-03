import { parseEntityDescriptionMeta } from '@/lib/entity/entityForm';
import { hashClubCompanyPassword } from '@/lib/club/clubDirectLogin';
import {
  mergeClubDescriptionForSave,
  type ClubProfileFormPayload,
} from '@/lib/club/clubProfilePayload';

export function findEntityByCompanyUsername(
  rows: { description: string | null }[],
  loginIdentifier: string,
): boolean {
  return findEntityIdByCompanyUsername(
    rows.map((row, index) => ({ id: String(index), description: row.description })),
    loginIdentifier,
  ) !== null;
}

export function findEntityIdByCompanyUsername(
  rows: { id: string; description: string | null }[],
  loginIdentifier: string,
): string | null {
  const needle = loginIdentifier.trim().toLowerCase();
  if (!needle) return null;

  for (const row of rows) {
    const meta = parseEntityDescriptionMeta(row.description);
    const username = meta.username?.trim().toLowerCase();
    if (username && username === needle) return row.id;
  }
  return null;
}

export function isEntityProfilePatch(body: Record<string, unknown>): boolean {
  return [
    'username',
    'officialName',
    'category',
    'country',
    'region',
    'location',
    'zipCode',
    'address',
    'geo',
    'mail',
    'directAccess',
    'directRegistrationCode',
    'clubPassword',
    'referencesHtml',
    'referencesLevel',
  ].some((k) => k in body);
}

export async function mergeEntityProfileDescriptionForPatch(
  existingDescription: string | null | undefined,
  payload: ClubProfileFormPayload,
): Promise<{ description: string; clubPasswordHash?: string }> {
  let clubPasswordHash: string | undefined;
  const newPassword = String(payload.clubPassword ?? '').trim();
  if (newPassword) {
    clubPasswordHash = await hashClubCompanyPassword(newPassword);
  }

  const description = mergeClubDescriptionForSave(existingDescription, payload, {
    clubPasswordHash,
  });

  return { description, clubPasswordHash };
}
