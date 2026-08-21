import { tryEntityDirectAccessLogin } from '@/lib/entity/entityDirectAccessLogin';

export type ClubDirectAccessLoginResult = {
  adminId: string;
  clubId: string;
  redirectTo: string;
};

/** @deprecated Prefer `tryEntityDirectAccessLogin`. */
export async function tryClubDirectAccessLogin(
  loginIdentifier: string,
  password: string,
): Promise<ClubDirectAccessLoginResult | null> {
  const hit = await tryEntityDirectAccessLogin(loginIdentifier, password);
  if (!hit || hit.kind !== 'club') return null;
  return {
    adminId: hit.adminId,
    clubId: hit.entityId,
    redirectTo: hit.redirectTo,
  };
}
