/**
 * Optional JSON blob inside `StaffAccount.otherInfos` under this key.
 * Used when super-admin form data has been saved; absent or invalid JSON leaves defaults.
 */
export const SUPER_ADMIN_SNAPSHOT_KEY = 'movesbookSuperAdminSettings' as const;

export type SuperAdminBoolPair = { my: boolean; other: boolean };

export type SuperAdminSnapshot = {
  language?: string;
  idCardCode?: string;
  commissionPct?: string;
  autoAssignCommission?: boolean;
  operatorPerms?: Record<string, SuperAdminBoolPair>;
  otherSettings?: Record<string, SuperAdminBoolPair>;
  otherPerms?: Record<string, boolean>;
  postPerms?: Record<string, boolean>;
};

export function parseSuperAdminSnapshotFromOtherInfos(
  otherInfos: string | null | undefined,
): SuperAdminSnapshot | null {
  const raw = String(otherInfos ?? '').trim();
  if (!raw.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const bag = parsed as Record<string, unknown>;
    const inner = bag[SUPER_ADMIN_SNAPSHOT_KEY];
    if (!inner || typeof inner !== 'object') return null;
    return inner as SuperAdminSnapshot;
  } catch {
    return null;
  }
}

export function mergeBoolPairMatrix<T extends Record<string, SuperAdminBoolPair>>(
  defaults: T,
  partial?: Record<string, SuperAdminBoolPair> | null,
): T {
  if (!partial) return defaults;
  const out = { ...defaults } as T;
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const p = partial[key as string];
    if (p && typeof p.my === 'boolean' && typeof p.other === 'boolean') {
      (out as Record<string, SuperAdminBoolPair>)[key as string] = { my: p.my, other: p.other };
    }
  }
  return out;
}

export function mergeBoolMap<T extends Record<string, boolean>>(
  defaults: T,
  partial?: Record<string, boolean> | null,
): T {
  if (!partial) return defaults;
  const out = { ...defaults } as T;
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    const v = partial[key as string];
    if (typeof v === 'boolean') {
      (out as Record<string, boolean>)[key as string] = v;
    }
  }
  return out;
}
