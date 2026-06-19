import { prisma } from '@/lib/prisma';
import { getSettingsColumns } from './legacyDb';

const DATE_COLUMNS = new Set(['valid_from', 'valid_to', 'delete_date']);

/** Avoid Prisma errors when legacy rows contain `0000-00-00` DATE values. */
export async function buildPromocodeSettingsSelectSql(tableName: string): Promise<string> {
  const columns = await getSettingsColumns();
  if (columns.size === 0) {
    return [
      '`id`',
      '`code`',
      'CAST(`valid_from` AS CHAR) AS `valid_from`',
      'CAST(`valid_to` AS CHAR) AS `valid_to`',
      '`enable`',
      '`usable_by`',
      '`version_id`',
      '`discount`',
      '`delete_status`',
      '`created`',
      '`modified`',
    ].join(', ');
  }

  return Array.from(columns)
    .map((col) =>
      DATE_COLUMNS.has(col) ? `CAST(\`${col}\` AS CHAR) AS \`${col}\`` : `\`${col}\``
    )
    .join(', ');
}

export function sanitizeLegacyDateString(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return value.toISOString().slice(0, 10);
  }

  const s = String(value).trim();
  if (!s || s === '0000-00-00' || s.startsWith('0000-00-00')) return null;
  if (/-00(-00)?$/.test(s) || /-\d{2}-00/.test(s)) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
}

/** Fix zero/invalid legacy DATE values that break Prisma reads. */
export async function repairInvalidPromocodeSettingDates(tableName = 'promocode_settings'): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET valid_to = CURDATE()
       WHERE CAST(valid_to AS CHAR) = '0000-00-00'
          OR CAST(valid_to AS CHAR) LIKE '%-00-%'
          OR CAST(valid_to AS CHAR) LIKE '%-00'`
    );
    await prisma.$executeRawUnsafe(
      `UPDATE \`${tableName}\`
       SET valid_from = CURDATE()
       WHERE CAST(valid_from AS CHAR) = '0000-00-00'
          OR CAST(valid_from AS CHAR) LIKE '%-00-%'
          OR CAST(valid_from AS CHAR) LIKE '%-00'`
    );
  } catch (err) {
    console.warn('repairInvalidPromocodeSettingDates skipped:', err);
  }
}
