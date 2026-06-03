export type FavouritePriority = 'not_selected' | 'low' | 'medium' | 'high';

export type ProfilePanelSettings = {
  tagged: boolean;
  favouritePriority: FavouritePriority;
};

export const DEFAULT_PROFILE_PANEL_SETTINGS: ProfilePanelSettings = {
  tagged: false,
  favouritePriority: 'not_selected',
};

const FAVOURITE_PRIORITIES = new Set<FavouritePriority>([
  'not_selected',
  'low',
  'medium',
  'high',
]);

export function normalizeFavouritePriority(value: unknown): FavouritePriority {
  const raw = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  if (raw === 'not_selected' || raw === '' || raw === 'notselected') return 'not_selected';
  if (raw === 'low' || raw === 'low_priority') return 'low';
  if (raw === 'medium' || raw === 'medium_priority') return 'medium';
  if (raw === 'high' || raw === 'high_priority') return 'high';
  return FAVOURITE_PRIORITIES.has(raw as FavouritePriority)
    ? (raw as FavouritePriority)
    : 'not_selected';
}

export function parseAdminSettingsJson(raw: string | null | undefined): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function readProfilePanelSettings(adminSettingsRaw: string | null | undefined): ProfilePanelSettings {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const panel = adminSettings.profilePanel;
  if (!panel || typeof panel !== 'object') {
    return { ...DEFAULT_PROFILE_PANEL_SETTINGS };
  }
  const record = panel as Record<string, unknown>;
  return {
    tagged: Boolean(record.tagged),
    favouritePriority: normalizeFavouritePriority(record.favouritePriority),
  };
}

export function mergeProfilePanelIntoAdminSettings(
  adminSettingsRaw: string | null | undefined,
  patch: Partial<ProfilePanelSettings>,
): string {
  const adminSettings = parseAdminSettingsJson(adminSettingsRaw);
  const current = readProfilePanelSettings(adminSettingsRaw);
  const next: ProfilePanelSettings = {
    tagged: patch.tagged !== undefined ? Boolean(patch.tagged) : current.tagged,
    favouritePriority:
      patch.favouritePriority !== undefined
        ? normalizeFavouritePriority(patch.favouritePriority)
        : current.favouritePriority,
  };
  return JSON.stringify({
    ...adminSettings,
    profilePanel: {
      ...next,
      updatedAt: new Date().toISOString(),
    },
  });
}

export function favouritePriorityLabel(priority: FavouritePriority): string {
  switch (priority) {
    case 'low':
      return 'Low priority';
    case 'medium':
      return 'Medium priority';
    case 'high':
      return 'High priority';
    default:
      return 'Not selected';
  }
}
