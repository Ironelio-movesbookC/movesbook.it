import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';

export type MembershipDates = {
  from: string;
  to: string;
  source: 'archive' | 'joined';
};

function isoDate(value: unknown): string {
  if (!value) return '';
  const raw = value instanceof Date ? value.toISOString() : String(value);
  return raw.slice(0, 10);
}

/** Latest membership row from Archive of Memberships (legacy subscriptions table). */
export async function getLatestMembershipDates(
  clubId: string,
  memberUserId: string,
  joinedAt?: Date | null,
): Promise<MembershipDates | null> {
  const table = await findExistingTable(['club_member_subscriptions', 'club_member_subscription']);

  if (table) {
    try {
      const rows = await prisma.$queryRawUnsafe<
        { start_date: Date | string | null; end_date: Date | string | null }[]
      >(
        `SELECT start_date, end_date FROM \`${table}\`
         WHERE club_id = ? AND user_id = ?
           AND (delete_status IS NULL OR delete_status = 0)
         ORDER BY end_date DESC, id DESC
         LIMIT 1`,
        clubId,
        memberUserId,
      );
      const row = rows[0];
      if (row) {
        const from = isoDate(row.start_date);
        const to = isoDate(row.end_date);
        if (from || to) {
          return {
            from: from || isoDate(joinedAt),
            to: to || '',
            source: 'archive',
          };
        }
      }
    } catch {
      // fall through to joinedAt
    }
  }

  if (joinedAt) {
    const from = isoDate(joinedAt);
    return { from, to: '', source: 'joined' };
  }

  return null;
}
