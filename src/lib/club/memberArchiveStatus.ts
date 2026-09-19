/** Archive of Users — Athletes\\Members vs pending vs not-members. */

export const MEMBER_ARCHIVE_STATUSES = ['member', 'pending', 'not_member'] as const;

export type MemberArchiveStatus = (typeof MEMBER_ARCHIVE_STATUSES)[number];

export function normalizeMemberArchiveStatus(
  role: string | null | undefined,
): MemberArchiveStatus {
  const raw = String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  if (raw === 'pending') return 'pending';
  if (raw === 'not_member' || raw === 'notmember') return 'not_member';
  return 'member';
}

export function isMemberArchiveStatus(value: string): value is MemberArchiveStatus {
  return (MEMBER_ARCHIVE_STATUSES as readonly string[]).includes(value);
}

/** Row text color for All the users profiles. */
export function memberArchiveStatusTextClass(status: MemberArchiveStatus): string {
  switch (status) {
    case 'pending':
      return 'text-red-600';
    case 'not_member':
      return 'text-blue-600';
    default:
      return 'text-black';
  }
}

/** Circle button beside the avatar. */
export function memberArchiveStatusDotClass(status: MemberArchiveStatus): string {
  switch (status) {
    case 'pending':
      return 'bg-red-500 hover:bg-red-600';
    case 'not_member':
      return 'bg-blue-500 hover:bg-blue-600';
    default:
      return 'bg-green-500';
  }
}

export function memberArchiveStatusLabel(status: MemberArchiveStatus): string {
  switch (status) {
    case 'pending':
      return 'Member in pending';
    case 'not_member':
      return 'Athlete not member';
    default:
      return 'Athlete / Member';
  }
}

/** Persist value written to ClubMember.role / TeamMember.role. */
export function roleValueForMemberArchiveStatus(status: MemberArchiveStatus): string {
  return status;
}
