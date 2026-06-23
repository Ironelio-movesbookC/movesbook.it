import { prisma } from '@/lib/prisma';

/** Read-only lookup for legacy CakePHP table names (no runtime DDL). */
export async function findExistingTable(candidates: string[]): Promise<string | null> {
  if (candidates.length === 0) return null;
  const placeholders = candidates.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );
  const existing = new Set(rows.map((r) => r.TABLE_NAME));
  return candidates.find((c) => existing.has(c)) ?? null;
}
