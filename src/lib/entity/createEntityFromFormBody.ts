import type { EntityProfileFormPayload } from '@/lib/entity/entityForm';
import { mergeEntityDescriptionForSave } from '@/lib/entity/entityForm';
import { hashClubCompanyPassword } from '@/lib/club/clubDirectLogin';
import {
  isTeamProfilePayload,
  mergeTeamDescriptionForSave,
} from '@/lib/team/teamProfilePayload';
import type { TeamProfileFormPayload } from '@/lib/team/teamProfileTypes';

export type CreateEntityBody = {
  create?: boolean;
} & Partial<EntityProfileFormPayload | TeamProfileFormPayload>;

export function isExplicitEntityCreate(body: CreateEntityBody | null): boolean {
  if (!body || typeof body !== 'object') return false;
  if (body.create === true) return true;
  if (isTeamProfilePayload(body as Record<string, unknown>)) {
    return Boolean(
      String(body.username ?? '').trim() ||
        String((body as TeamProfileFormPayload).officialName ?? '').trim(),
    );
  }
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

export async function buildTeamDescriptionFromBody(
  body: TeamProfileFormPayload,
): Promise<string> {
  const clubPasswordHash = await hashClubCompanyPassword(body.teamPassword);
  return mergeTeamDescriptionForSave(null, body, {
    clubPasswordHash,
    isCreate: true,
  });
}
