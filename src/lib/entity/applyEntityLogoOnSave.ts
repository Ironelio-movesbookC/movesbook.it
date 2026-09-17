import {
  managedEntityKindToLogoKind,
} from '@/lib/entity/entityLogo';
import type { ManagedEntityKind } from '@/lib/entity/entityProfileLabels';
import {
  removeEntityLogo,
  uploadEntityLogo,
} from '@/lib/entity/uploadEntityLogoClient';
import type { ClubProfileSavePayload } from '@/lib/club/clubProfilePayload';

/**
 * Upload or remove entity logo.
 * @returns New public logo path, `null` when removed, `undefined` when unchanged.
 */
export async function applyEntityLogoOnSave(
  kind: ManagedEntityKind,
  entityId: string,
  payload: ClubProfileSavePayload,
): Promise<string | null | undefined> {
  const logoKind = managedEntityKindToLogoKind(kind);
  if (payload.removeLogo) {
    await removeEntityLogo(logoKind, entityId);
    return null;
  }
  if (payload.logoFile) {
    return uploadEntityLogo(logoKind, entityId, payload.logoFile);
  }
  return undefined;
}
