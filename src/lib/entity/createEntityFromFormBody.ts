import type { EntityProfileFormPayload } from '@/lib/entity/entityForm';
import { mergeEntityDescriptionForSave } from '@/lib/entity/entityForm';
import { hashClubCompanyPassword } from '@/lib/club/clubDirectLogin';

export type CreateEntityBody = {
  create?: boolean;
} & Partial<EntityProfileFormPayload>;

export function isExplicitEntityCreate(body: CreateEntityBody | null): boolean {
  if (!body || typeof body !== 'object') return false;
  if (body.create === true) return true;
  return Boolean(
    String(body.officialName ?? '').trim() || String(body.username ?? '').trim(),
  );
}

export async function buildEntityDescriptionFromBody(
  body: EntityProfileFormPayload,
): Promise<string> {
  const clubPasswordHash = await hashClubCompanyPassword(body.clubPassword);
  return mergeEntityDescriptionForSave(null, body, {
    clubPasswordHash,
    isCreate: true,
  });
}
