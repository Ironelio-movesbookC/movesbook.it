import { prisma } from '@/lib/prisma';
import { outcomeService } from '@/lib/outcomes';

/** Sample outcome types inspired by CakePHP access / card-reader control messages. */
export const SAMPLE_OUTCOME_TYPES = [
  {
    description: 'Access allowed',
    defaultCode: 'A01',
    primaryMessages: [
      'Access allowed. Welcome.',
      'Entry permitted. Have a good workout.',
      'Access granted.',
    ],
    customMessages: [
      'Welcome! Your access is confirmed.',
      'Entry allowed — enjoy your session.',
      'Access OK for this reader.',
    ],
  },
  {
    description: 'Access denied — card not assigned to member',
    defaultCode: 'D01',
    primaryMessages: [
      'Access denied. Card not assigned to a member.',
      'Unknown card. Please contact reception.',
    ],
    customMessages: [
      'Card not linked to any member profile.',
      'This card is not registered in the system.',
    ],
  },
  {
    description: 'Access denied — card not active',
    defaultCode: 'D02',
    primaryMessages: [
      'Access denied. Card is not active.',
      'Inactive membership card.',
    ],
    customMessages: [
      'Your card is suspended or inactive.',
      'Card status: not active.',
    ],
  },
  {
    description: 'Access denied — no active subscription',
    defaultCode: 'D03',
    primaryMessages: [
      'Access denied. No active subscription found.',
      'No valid subscription for entry.',
    ],
    customMessages: [
      'No active subscription on file.',
      'Subscription required for this access.',
    ],
  },
  {
    description: 'Access denied — subscription does not match reader activities',
    defaultCode: 'D04',
    primaryMessages: [
      'Access denied. Subscription does not cover this activity.',
      'Your plan does not include this area.',
    ],
    customMessages: [
      'This reader is not included in your subscription.',
      'Activity not covered by current membership.',
    ],
  },
  {
    description: 'Access denied — member blocked',
    defaultCode: 'D05',
    primaryMessages: [
      'Access denied. Member is blocked.',
      'Entry not permitted for this member.',
    ],
    customMessages: [
      'Member account is blocked. See reception.',
      'Access blocked by club administration.',
    ],
  },
  {
    description: 'Access denied — medical certificate expired',
    defaultCode: 'D06',
    primaryMessages: [
      'Access denied. Medical certificate expired.',
      'Valid medical certificate required.',
    ],
    customMessages: [
      'Medical certificate expired — please renew.',
      'Health documentation required for entry.',
    ],
  },
  {
    description: 'Access denied — debt exceeds maximum allowed',
    defaultCode: 'D07',
    primaryMessages: [
      'Access denied. Outstanding debt exceeds the limit.',
      'Please settle payments at reception.',
    ],
    customMessages: [
      'Payment required before entry.',
      'Account balance exceeds allowed debt.',
    ],
  },
  {
    description: 'Warning — subscription expiring soon',
    defaultCode: 'W01',
    primaryMessages: [
      'Warning. Subscription expiring soon.',
      'Your membership will expire shortly.',
    ],
    customMessages: [
      'Reminder: renew your subscription soon.',
      'Membership expiry approaching.',
    ],
  },
  {
    description: 'Access denied — re-entry not allowed',
    defaultCode: 'D08',
    primaryMessages: [
      'Access denied. Re-entry is not allowed yet.',
      'Please wait before entering again.',
    ],
    customMessages: [
      'Re-entry interval not elapsed.',
      'You cannot enter again at this time.',
    ],
  },
  {
    description: 'Access denied — weekly access limit reached',
    defaultCode: 'D09',
    primaryMessages: [
      'Access denied. Weekly access limit reached.',
      'No remaining visits for this week.',
    ],
    customMessages: [
      'Weekly visit limit exhausted.',
      'Maximum weekly accesses used.',
    ],
  },
  {
    description: 'Parking access allowed',
    defaultCode: 'P01',
    primaryMessages: [
      'Parking access allowed.',
      'Vehicle entry permitted.',
    ],
    customMessages: [
      'Welcome to the parking area.',
      'Parking access granted.',
    ],
  },
] as const;

function pickRandom<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

async function findExistingTable(candidates: string[]): Promise<string | null> {
  const placeholders = candidates.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ TABLE_NAME: string }[]>(
    `SELECT TABLE_NAME
     FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME IN (${placeholders})`,
    ...candidates
  );
  const existing = new Set(rows.map((row) => row.TABLE_NAME));
  return candidates.find((candidate) => existing.has(candidate)) ?? null;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  const rows = await prisma.$queryRawUnsafe<{ COLUMN_NAME: string }[]>(
    `SELECT COLUMN_NAME
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?`,
    tableName
  );
  return new Set(rows.map((row) => row.COLUMN_NAME));
}

/** @deprecated Use outcomeService.seedOutcomeTypesIfEmpty() — no runtime DDL. */
export async function ensureOutcomeSettingsTables(): Promise<{
  typeTable: string;
  audioSettingsTable: string;
  clubAudioTable: string;
}> {
  await outcomeService.seedOutcomeTypesIfEmpty();
  return {
    typeTable: 'audio_setting_types',
    audioSettingsTable: 'audio_settings',
    clubAudioTable: 'club_audio_settings',
  };
}

/** @deprecated Migrated to Prisma outcome tables. */
export async function seedOutcomeSettingsIfEmpty(_options: {
  clubIds: string[];
  primaryLanguageId?: number;
}): Promise<boolean> {
  await outcomeService.seedOutcomeTypesIfEmpty();
  return false;
}
