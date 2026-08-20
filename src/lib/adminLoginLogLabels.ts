import { UserType } from '@prisma/client';
import { CLUB_STAFF_DB_USER_TYPES } from '@/lib/club/clubStaff.constants';

/** Movesbook user types shown on /admin/logins/users (ID5–ID9). */
export const MOVESBOOK_LOGIN_USER_TYPES: UserType[] = [
  UserType.ATHLETE,
  UserType.COACH,
  UserType.TEAM,
  UserType.TEAM_MANAGER,
  UserType.CLUB,
  UserType.CLUB_TRAINER,
  ...(CLUB_STAFF_DB_USER_TYPES as unknown as UserType[]),
  UserType.GROUP,
  UserType.GROUP_ADMIN,
];

export function movesbookUserTypeLabel(userType: UserType): string {
  switch (userType as string) {
    case UserType.ATHLETE:
      return 'Single User';
    case UserType.COACH:
      return 'Coach';
    case UserType.TEAM:
    case UserType.TEAM_MANAGER:
      return 'Team admin';
    case UserType.CLUB:
    case UserType.CLUB_TRAINER:
      return 'Club admin';
    case 'CLUB_COADMIN':
      return 'Club coadmin';
    case 'CLUB_OPERATOR':
      return 'Club operator';
    case 'CLUB_COLLABORATOR':
      return 'Club collaborator';
    case UserType.GROUP:
    case UserType.GROUP_ADMIN:
      return 'Group admin';
    default:
      return String(userType);
  }
}

export function panelOperatorUserTypeLabel(kind: 'SUPER_ADMIN' | 'CO_ADMIN' | 'OPERATOR'): string {
  switch (kind) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'CO_ADMIN':
      return 'Co-Admin';
    case 'OPERATOR':
      return 'Operator';
    default:
      return kind;
  }
}

/** Staff roles for /admin/logins/editors (Translators and Web operators; excludes typo-only label). */
export function isEditorStaffRole(roleLabel: string | null | undefined): boolean {
  const raw = (roleLabel ?? '').trim();
  if (!raw) return false;
  const r = raw.toLowerCase();
  if (r === 'translatros') return false;
  if (r === 'translators' || r.includes('translator')) return true;
  if (r === 'web_operators' || r.includes('web operator') || r.includes('weboperator')) return true;
  return false;
}

export function editorStaffRoleLabel(roleLabel: string | null | undefined): string {
  const raw = (roleLabel ?? '').trim();
  const r = raw.toLowerCase();
  if (r === 'web_operators' || r.includes('web operator') || r.includes('weboperator')) {
    return 'Web operator';
  }
  return 'Translator';
}
