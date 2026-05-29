import { prisma } from '@/lib/prisma';

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

export async function ensureOutcomeSettingsTables(): Promise<{
  typeTable: string;
  audioSettingsTable: string;
  clubAudioTable: string;
}> {
  const typeTable = 'audio_setting_types';
  const audioSettingsTable = 'audio_settings';
  const clubAudioTable = 'club_audio_settings';

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${typeTable}\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      message_description VARCHAR(500) NOT NULL,
      default_msg_code VARCHAR(50) NOT NULL DEFAULT '',
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${audioSettingsTable}\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      message_type_id INT NOT NULL,
      language INT NOT NULL DEFAULT 1,
      code VARCHAR(50) NOT NULL DEFAULT '',
      message VARCHAR(500) NOT NULL DEFAULT '',
      audio VARCHAR(255) NULL,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_audio_settings_lang_type (language, message_type_id)
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS \`${clubAudioTable}\` (
      id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      club_id VARCHAR(191) NOT NULL,
      message_type_id INT NOT NULL,
      language INT NOT NULL DEFAULT 0,
      code VARCHAR(50) NOT NULL DEFAULT '',
      message VARCHAR(500) NOT NULL DEFAULT '',
      audio VARCHAR(255) NULL,
      created DATETIME DEFAULT CURRENT_TIMESTAMP,
      modified DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_club_audio_club_lang (club_id, language, message_type_id)
    )
  `);

  return { typeTable, audioSettingsTable, clubAudioTable };
}

export async function seedOutcomeSettingsIfEmpty(options: {
  clubIds: string[];
  primaryLanguageId?: number;
}): Promise<boolean> {
  const { clubIds, primaryLanguageId = 1 } = options;
  const clubId = clubIds[0];
  if (!clubId) return false;

  let typeTable = await findExistingTable(['audio_setting_types', 'audio_setting_type']);
  let audioTable = await findExistingTable(['audio_settings', 'audio_setting']);
  let clubTable = await findExistingTable(['club_audio_settings', 'club_audio_setting']);

  if (!typeTable || !audioTable || !clubTable) {
    const created = await ensureOutcomeSettingsTables();
    typeTable = typeTable ?? created.typeTable;
    audioTable = audioTable ?? created.audioSettingsTable;
    clubTable = clubTable ?? created.clubAudioTable;
  }

  const typeCount = await prisma.$queryRawUnsafe<{ c: bigint | number }[]>(
    `SELECT COUNT(*) AS c FROM \`${typeTable}\``
  );
  if (Number(typeCount[0]?.c ?? 0) > 0) {
    return false;
  }

  const typeCols = await getTableColumns(typeTable);
  const audioCols = await getTableColumns(audioTable);
  const clubCols = await getTableColumns(clubTable);

  const descCol = typeCols.has('message_description') ? 'message_description' : 'name';
  const codeCol = typeCols.has('default_msg_code') ? 'default_msg_code' : null;

  for (let i = 0; i < SAMPLE_OUTCOME_TYPES.length; i++) {
    const sample = SAMPLE_OUTCOME_TYPES[i];
    const typeFields = [descCol];
    const typeValues: unknown[] = [sample.description];
    if (codeCol) {
      typeFields.push(codeCol);
      typeValues.push(sample.defaultCode);
    }

    await prisma.$executeRawUnsafe(
      `INSERT INTO \`${typeTable}\` (${typeFields.map((f) => `\`${f}\``).join(', ')})
       VALUES (${typeFields.map(() => '?').join(', ')})`,
      ...typeValues
    );

    const idRows = await prisma.$queryRawUnsafe<{ id: bigint | number }[]>(
      'SELECT LAST_INSERT_ID() AS id'
    );
    const typeId = Number(idRows[0]?.id ?? i + 1);
    const primaryCode = sample.defaultCode;
    const customCode = `${sample.defaultCode}-C`;
    const primaryMessage = pickRandom(sample.primaryMessages);
    const customMessage = pickRandom(sample.customMessages);

    const audioFields: Record<string, unknown> = {
      message_type_id: typeId,
      language: primaryLanguageId,
      code: primaryCode,
      message: primaryMessage,
    };
    const audioFieldNames = Object.keys(audioFields).filter((k) => audioCols.has(k));
    if (audioFieldNames.length > 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${audioTable}\` (${audioFieldNames.map((f) => `\`${f}\``).join(', ')})
         VALUES (${audioFieldNames.map(() => '?').join(', ')})`,
        ...audioFieldNames.map((k) => audioFields[k])
      );
    }

    const clubFields: Record<string, unknown> = {
      club_id: clubId,
      message_type_id: typeId,
      language: 0,
      code: customCode,
      message: customMessage,
    };
    const clubFieldNames = Object.keys(clubFields).filter((k) => clubCols.has(k));
    if (clubFieldNames.length > 0) {
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${clubTable}\` (${clubFieldNames.map((f) => `\`${f}\``).join(', ')})
         VALUES (${clubFieldNames.map(() => '?').join(', ')})`,
        ...clubFieldNames.map((k) => clubFields[k])
      );
    }
  }

  return true;
}
