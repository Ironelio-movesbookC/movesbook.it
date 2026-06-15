import { prisma } from '@/lib/prisma';
import { getTableColumns } from '@/lib/outcomeSettingsDb';

let userSettingsSchemaEnsured = false;

const USER_SETTINGS_COLUMN_DEFS: [string, string][] = [
  ['nutritionPreferences', 'TEXT NULL'],
  ['yearlyPlanStartDate', 'DATETIME NULL'],
  ['templateWeeksStartDate', 'DATETIME NULL'],
  ['newsTopicOrder', 'TEXT NULL'],
  ['weeklyStructureV1', 'LONGTEXT NULL'],
];

export async function ensureUserSettingsColumns(): Promise<void> {
  if (userSettingsSchemaEnsured) return;

  const table = 'user_settings';
  const exists = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? LIMIT 1`,
    table
  );
  if (exists.length === 0) {
    userSettingsSchemaEnsured = true;
    return;
  }

  const columns = await getTableColumns(table);
  for (const [columnName, columnDefinition] of USER_SETTINGS_COLUMN_DEFS) {
    if (!columns.has(columnName)) {
      await prisma.$executeRawUnsafe(
        `ALTER TABLE \`${table}\` ADD COLUMN \`${columnName}\` ${columnDefinition}`
      );
    }
  }

  userSettingsSchemaEnsured = true;
}
