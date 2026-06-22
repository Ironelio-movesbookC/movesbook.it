import { prisma } from '@/lib/prisma';
import { findExistingTable } from '@/lib/club/legacyTableLookup';
import { fetchClubMemberOptions } from './clubMembers';

const EXPENSE_TABLE_CANDIDATES = ['expenses'];

function text(value: unknown): string {
  return String(value ?? '').trim();
}

async function getLegacyUserId(userId: string): Promise<string | null> {
  const fromId = userId.match(/^legacy_(\d+)(?:_|$)/);
  if (fromId?.[1]) return fromId[1];

  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id
     FROM \`${mappingTable}\`
     WHERE new_id = ?
       AND legacy_table = 'users'
     ORDER BY legacy_id DESC
     LIMIT 1`,
    userId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

export type ExpenseFormOptions = {
  expenses: { id: string; name: string }[];
  members: { id: string; name: string }[];
};

export async function fetchExpenseFormOptions(clubId: string): Promise<ExpenseFormOptions> {
  const members = await fetchClubMemberOptions(clubId);
  const expenses: { id: string; name: string }[] = [];

  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { adminId: true },
  });
  if (!club) return { expenses, members };

  const legacyUserId = await getLegacyUserId(club.adminId);
  const expenseTable = await findExistingTable(EXPENSE_TABLE_CANDIDATES);

  if (expenseTable && legacyUserId) {
    const rows = await prisma.$queryRawUnsafe<{ id: bigint | number; name: string }[]>(
      `SELECT id, name FROM \`${expenseTable}\`
       WHERE user_id = ?
       ORDER BY name ASC`,
      legacyUserId
    );
    for (const row of rows) {
      const name = text(row.name);
      if (!name) continue;
      expenses.push({ id: String(row.id), name });
    }
  }

  return { expenses, members };
}
