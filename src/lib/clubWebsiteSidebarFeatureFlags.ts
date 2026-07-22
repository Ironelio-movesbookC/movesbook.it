import type { SidebarTopicStatus } from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';
import {
  MOVEBOOK_TOPIC_ROWS,
  SOCIAL_SITE_ROWS,
} from '@/components/club/websiteSettings/clubWebsiteSettingsSidebarData';
import { dispatchClubWebsiteSettingsChanged } from '@/lib/clubWebsiteSettingsEvents';
import { isManagedEntityAdminUserType } from '@/utils/dashboardRouting';

const STORAGE_PREFIX = 'club-website-sidebar-features';

export type ClubWebsiteSidebarFeatureFlags = {
  movebook: Record<string, SidebarTopicStatus>;
  social: Record<string, SidebarTopicStatus>;
};

function storageKey(ownerId: string): string {
  return `${STORAGE_PREFIX}:${ownerId}`;
}

function defaultMovebookFlags(): Record<string, SidebarTopicStatus> {
  return Object.fromEntries(
    MOVEBOOK_TOPIC_ROWS.map((r) => [r.id, r.defaultStatus ?? 'on'])
  );
}

function defaultSocialFlags(): Record<string, SidebarTopicStatus> {
  return Object.fromEntries(SOCIAL_SITE_ROWS.map((r) => [r.id, 'on' as SidebarTopicStatus]));
}

export function defaultClubWebsiteSidebarFeatureFlags(): ClubWebsiteSidebarFeatureFlags {
  return {
    movebook: defaultMovebookFlags(),
    social: defaultSocialFlags(),
  };
}

export function loadClubWebsiteSidebarFeatureFlags(
  ownerId: string | null | undefined
): ClubWebsiteSidebarFeatureFlags {
  const defaults = defaultClubWebsiteSidebarFeatureFlags();
  if (!ownerId || typeof window === 'undefined') return defaults;
  try {
    const raw = localStorage.getItem(storageKey(ownerId));
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<ClubWebsiteSidebarFeatureFlags>;
    return {
      movebook: { ...defaults.movebook, ...(parsed.movebook ?? {}) },
      social: { ...defaults.social, ...(parsed.social ?? {}) },
    };
  } catch {
    return defaults;
  }
}

export function saveClubWebsiteSidebarFeatureFlags(
  ownerId: string | null | undefined,
  flags: ClubWebsiteSidebarFeatureFlags
): void {
  if (!ownerId || typeof window === 'undefined') return;
  localStorage.setItem(storageKey(ownerId), JSON.stringify(flags));
  dispatchClubWebsiteSettingsChanged(ownerId);
}

/** ID6 Coach, ID7 Team, ID8 Club, ID9 Group — not ID5 Single User. */
export function canToggleClubWebsiteSidebarFeatures(userType: string): boolean {
  return isManagedEntityAdminUserType(userType);
}

export function isSidebarFeatureEnabled(
  flags: ClubWebsiteSidebarFeatureFlags,
  section: 'movebook' | 'social',
  id: string
): boolean {
  return (flags[section][id] ?? 'on') === 'on';
}
