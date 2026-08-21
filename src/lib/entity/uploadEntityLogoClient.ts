import type { ManagedEntityLogoKind } from '@/lib/entity/entityLogo';

function logoApiPath(kind: ManagedEntityLogoKind, entityId: string): string {
  switch (kind) {
    case 'club':
      return `/api/clubs/${encodeURIComponent(entityId)}/logo`;
    case 'team':
      return `/api/teams/${encodeURIComponent(entityId)}/logo`;
    case 'group':
      return `/api/groups/${encodeURIComponent(entityId)}/logo`;
    case 'coach':
      return `/api/coaching-groups/${encodeURIComponent(entityId)}/logo`;
  }
}

export async function uploadEntityLogo(
  kind: ManagedEntityLogoKind,
  entityId: string,
  file: File,
): Promise<string> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not signed in');

  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(logoApiPath(kind, entityId), {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Failed to upload logo',
    );
  }
  const logoUrl = typeof data.logoUrl === 'string' ? data.logoUrl : '';
  if (!logoUrl) throw new Error('Logo upload did not return a path');
  return logoUrl;
}

export async function removeEntityLogo(
  kind: ManagedEntityLogoKind,
  entityId: string,
): Promise<void> {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Not signed in');

  const res = await fetch(logoApiPath(kind, entityId), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof data.error === 'string' ? data.error : 'Failed to remove logo',
    );
  }
}
