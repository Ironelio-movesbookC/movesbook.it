import { prisma } from '@/lib/prisma';
import { ensureOutcomeSettingsTables, SAMPLE_OUTCOME_TYPES } from '@/lib/outcomeSettingsSeed';
import {
  audioPublicPath,
  findExistingTable,
  getTableColumns,
  text,
} from '@/lib/outcomeSettingsDb';
import { fetchOutcomeLanguages } from '@/lib/accessOutcomeMessages';

export { text, findExistingTable, getTableColumns, audioPublicPath };

const TYPE_TABLE_CANDIDATES = ['audio_setting_types', 'audio_setting_type'];
const AUDIO_SETTINGS_CANDIDATES = ['audio_settings', 'audio_setting'];
const DESC_TABLE_CANDIDATES = [
  'audio_setting_type_descriptions',
  'audio_setting_type_description',
];

export async function fetchLanguages(): Promise<{ id: number; name: string }[]> {
  return fetchOutcomeLanguages();
}

export async function seedTypesIfEmpty(): Promise<void> {
  await ensureOutcomeSettingsTables();
  const typeTable = await findExistingTable(TYPE_TABLE_CANDIDATES);
  if (!typeTable) return;

  const typeCount = await prisma.$queryRawUnsafe<{ c: bigint | number }[]>(
    `SELECT COUNT(*) AS c FROM \`${typeTable}\``
  );
  if (Number(typeCount[0]?.c ?? 0) > 0) return;

  const typeCols = await getTableColumns(typeTable);
  const descCol = typeCols.has('message_description') ? 'message_description' : 'name';
  const codeCol = typeCols.has('default_msg_code') ? 'default_msg_code' : null;

  for (const sample of SAMPLE_OUTCOME_TYPES) {
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
  }
}

export async function fetchAccessAudioItems(lang: number) {
  const typeTable = await findExistingTable(TYPE_TABLE_CANDIDATES);
  const settingsTable = await findExistingTable(AUDIO_SETTINGS_CANDIDATES);
  const descTable = await findExistingTable(DESC_TABLE_CANDIDATES);

  if (!typeTable) return [];

  const typeCols = await getTableColumns(typeTable);
  const descCol = typeCols.has('message_description')
    ? 'message_description'
    : typeCols.has('description')
      ? 'description'
      : 'name';
  const defaultCodeCol = typeCols.has('default_msg_code') ? 'default_msg_code' : null;

  const joinAlias = 's';
  const joinConditions = [`${joinAlias}.message_type_id = t.id`, `${joinAlias}.language = ?`];
  const joinParams: unknown[] = [lang];

  const settingsCols = settingsTable ? await getTableColumns(settingsTable) : new Set<string>();
  const codeSelect = settingsTable && settingsCols.has('code')
    ? `COALESCE(${joinAlias}.code, '') AS code`
    : "'' AS code";
  const messageSelect = settingsTable && settingsCols.has('message')
    ? `COALESCE(${joinAlias}.message, '') AS message`
    : "'' AS message";
  const audioSelect =
    settingsTable && settingsCols.has('audio') ? `${joinAlias}.audio AS audio` : 'NULL AS audio';
  const idSelect =
    settingsTable && settingsCols.has('id') ? `${joinAlias}.id AS settingId` : 'NULL AS settingId';

  const settingsJoin = settingsTable
    ? `LEFT JOIN \`${settingsTable}\` ${joinAlias} ON ${joinConditions.join(' AND ')}`
    : '';

  const rows = await prisma.$queryRawUnsafe<
    {
      typeId: number | string;
      description: string | null;
      defaultCode: string | null;
      settingId: number | string | null;
      code: string | null;
      message: string | null;
      audio: string | null;
    }[]
  >(
    `SELECT
      t.id AS typeId,
      COALESCE(t.\`${descCol}\`, '') AS description,
      ${defaultCodeCol ? `COALESCE(t.\`${defaultCodeCol}\`, '')` : "''"} AS defaultCode,
      ${idSelect},
      ${codeSelect},
      ${messageSelect},
      ${audioSelect}
    FROM \`${typeTable}\` t
    ${settingsJoin}
    ORDER BY t.id ASC`,
    ...joinParams
  );

  const descriptions: Record<string, { id: string; description: string }> = {};
  if (descTable && lang !== 0) {
    const descCols = await getTableColumns(descTable);
    const typeIdCol = descCols.has('message_type_id') ? 'message_type_id' : 'type_id';
    const langCol = descCols.has('language_id') ? 'language_id' : 'language';
    const descRows = await prisma.$queryRawUnsafe<
      { id: number | string; typeId: number | string; description: string | null }[]
    >(
      `SELECT id, \`${typeIdCol}\` AS typeId, description
       FROM \`${descTable}\`
       WHERE \`${langCol}\` = ?`,
      lang
    );
    for (const row of descRows) {
      descriptions[String(row.typeId)] = {
        id: String(row.id),
        description: text(row.description),
      };
    }
  }

  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return rows.map((row, index) => {
    const typeId = String(row.typeId);
    const defaultCode = text(row.defaultCode);
    const customDesc = descriptions[typeId];
    const description = text(row.description);
    const audioFile = row.audio ? text(row.audio) : null;

    return {
      typeId,
      settingId: row.settingId != null ? String(row.settingId) : null,
      descriptionId: customDesc?.id ?? null,
      letter: letters[index] ?? String(index + 1),
      description,
      code: text(row.code) || defaultCode,
      defaultCode,
      message: text(row.message),
      audioFile,
      audioUrl: audioFile ? audioPublicPath(lang, audioFile) : null,
    };
  });
}
