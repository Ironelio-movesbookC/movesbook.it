import type { UserType } from '@prisma/client';

/** Staff compose checkboxes — mapped from legacy PHP role ids without storing raw "5"/"8". */
export const STAFF_AUDIENCE_OPTIONS = [
  { value: 'ATHLETE' as const, label: 'Single Users', legacyRoleId: 5 },
  { value: 'CLUB' as const, label: 'Club Admins', legacyRoleId: 8 },
  { value: 'COACH' as const, label: 'Coaches', legacyRoleId: 6 },
  { value: 'TEAM' as const, label: 'Teams', legacyRoleId: 7 },
] as const;

export type StaffAudienceRole = (typeof STAFF_AUDIENCE_OPTIONS)[number]['value'];

export const NOTIFICATION_SOURCES = ['movesbook_staff', 'club_admin'] as const;
export type NotificationSource = (typeof NOTIFICATION_SOURCES)[number];

export const CLUB_AUDIENCE_KINDS = ['members', 'staff'] as const;
export type ClubAudienceKind = (typeof CLUB_AUDIENCE_KINDS)[number];

/** UserTypes that count as a selected staff audience role. */
export function userTypesForStaffAudienceRole(role: StaffAudienceRole): UserType[] {
  switch (role) {
    case 'ATHLETE':
      return ['ATHLETE'];
    case 'CLUB':
      return ['CLUB', 'CLUB_TRAINER'];
    case 'COACH':
      return ['COACH'];
    case 'TEAM':
      return ['TEAM', 'TEAM_MANAGER'];
    default:
      return [];
  }
}

export function expandStaffAudienceRoles(roles: string[]): UserType[] {
  const out = new Set<UserType>();
  for (const role of roles) {
    if (!isStaffAudienceRole(role)) continue;
    for (const ut of userTypesForStaffAudienceRole(role)) out.add(ut);
  }
  return Array.from(out);
}

export function isStaffAudienceRole(value: unknown): value is StaffAudienceRole {
  return STAFF_AUDIENCE_OPTIONS.some((o) => o.value === value);
}

export function isNotificationSource(value: unknown): value is NotificationSource {
  return value === 'movesbook_staff' || value === 'club_admin';
}

export function isClubAudienceKind(value: unknown): value is ClubAudienceKind {
  return value === 'members' || value === 'staff';
}

export function parseJsonStringArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((v) => String(v ?? '').trim()).filter(Boolean);
  } catch {
    return [];
  }
}

export function toJsonStringArray(values: string[]): string {
  return JSON.stringify(Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))));
}

/** Split username field: commas, spaces, newlines. */
export function parseUsernameInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  );
}
