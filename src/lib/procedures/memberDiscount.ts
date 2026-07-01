import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';

const ADDITIONAL_SETTINGS_TABLES = [
  'club_member_additional_settings',
  'club_member_additional_setting',
];

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Member services discount % from legacy club_member_additional_settings.service */
export async function fetchMemberServicesDiscount(
  clubUserId: string,
  memberId: string
): Promise<number> {
  const table = await findExistingTable(ADDITIONAL_SETTINGS_TABLES);
  if (!table) return 0;

  const rows = await prisma.$queryRawUnsafe<{ service: string | number | null }[]>(
    `SELECT service FROM \`${table}\`
     WHERE club_member_id = ? AND club_user_id = ?
     LIMIT 1`,
    memberId,
    clubUserId
  );

  return num(rows[0]?.service);
}
