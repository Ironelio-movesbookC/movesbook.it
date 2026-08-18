import {
  managedEntityKindToLogoKind,
} from '@/lib/entity/entityLogo';
import type { ManagedEntityKind } from '@/lib/entity/entityProfileLabels';
import {
  removeEntityLogo,
  uploadEntityLogo,
} from '@/lib/entity/uploadEntityLogoClient';
import type { ClubProfileSavePayload } from '@/lib/club/clubProfilePayload';

export async function applyEntityLogoOnSave(
  kind: ManagedEntityKind,
  entityId: string,
  payload: ClubProfileSavePayload,
): Promise<void> {
  const logoKind = managedEntityKindToLogoKind(kind);
  if (payload.removeLogo) {
    await removeEntityLogo(logoKind, entityId);
    return;
  }
  if (payload.logoFile) {
    await uploadEntityLogo(logoKind, entityId, payload.logoFile);
  }
}
