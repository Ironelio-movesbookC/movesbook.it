import { parseAdminSettingsJson } from '@/lib/admin/userProfilePanelSettings';

export type PcuAccessSettings = {
  accessStartIso: string;
  accessEndIso: string;
  suspendAccessControl: boolean;
  suspend: boolean;
};

export function readPcuAccessSettings(
  adminSettingsRaw: string | null | undefined,
  defaults: Pick<PcuAccessSettings, 'accessStartIso' | 'accessEndIso'>,
): PcuAccessSettings {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const panel = adminSettings.pcuAccess;
  if (!panel || typeof panel !== 'object') {
    return {
      accessStartIso: defaults.accessStartIso,
      accessEndIso: defaults.accessEndIso,
      suspendAccessControl: false,
      suspend: false,
    };
  }
  const record = panel as Record<string, unknown>;
  const storedStart =
    typeof record.accessStartIso === 'string' ? record.accessStartIso.trim() : '';
  const storedEnd =
    typeof record.accessEndIso === 'string' ? record.accessEndIso.trim() : '';
  return {
    accessStartIso: storedStart || defaults.accessStartIso,
    accessEndIso: storedEnd || defaults.accessEndIso,
    suspendAccessControl: Boolean(record.suspendAccessControl),
    suspend: Boolean(record.suspend),
  };
}

export function mergePcuAccessIntoAdminSettings(
  adminSettingsRaw: string | null | undefined,
  patch: Partial<PcuAccessSettings>,
): string {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const current = readPcuAccessSettings(adminSettingsRaw, {
    accessStartIso: '',
    accessEndIso: '',
  });
  const next: PcuAccessSettings = {
    accessStartIso:
      patch.accessStartIso !== undefined ? patch.accessStartIso : current.accessStartIso,
    accessEndIso: patch.accessEndIso !== undefined ? patch.accessEndIso : current.accessEndIso,
    suspendAccessControl:
      patch.suspendAccessControl !== undefined
        ? patch.suspendAccessControl
        : current.suspendAccessControl,
    suspend: patch.suspend !== undefined ? patch.suspend : current.suspend,
  };
  return JSON.stringify({
    ...adminSettings,
    pcuAccess: {
      ...next,
      updatedAt: new Date().toISOString(),
    },
  });
}
