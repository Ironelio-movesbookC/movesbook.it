import { prisma } from '@/lib/prisma';
import {
  audioPublicPath,
  findExistingTable,
  getTableColumns,
  text,
} from '@/lib/outcomeSettingsDb';

const LANGUAGE_TABLE_CANDIDATES = ['language_values', 'language_value'];
const TYPE_TABLE_CANDIDATES = ['audio_setting_types', 'audio_setting_type'];
const AUDIO_SETTINGS_CANDIDATES = ['audio_settings', 'audio_setting'];
const CLUB_AUDIO_CANDIDATES = ['club_audio_settings', 'club_audio_setting'];
const CLUBS_TABLE_CANDIDATES = ['clubs'];
const ACCESS_SETTINGS_TABLE = 'club_access_settings';

export type OutcomeLanguage = {
  id: number;
  name: string;
};

export type OutcomeMessageSource = 'member_country' | 'club_primary' | 'club_custom';

export type ResolvedOutcomeMessage = {
  messageTypeId: string;
  code: string;
  message: string;
  audioFile: string | null;
  audioUrl: string | null;
  languageId: number;
  source: OutcomeMessageSource;
  countryLanguageId: number | null;
};

/** Legacy language_values rows used by CakePHP audio_setting (ids match countries.country_lang_id). */
export const LEGACY_OUTCOME_LANGUAGES: OutcomeLanguage[] = [
  { id: 1, name: 'English' },
  { id: 2, name: 'French' },
  { id: 3, name: 'Deutsch' },
  { id: 4, name: 'Italiano' },
  { id: 5, name: 'Spanish' },
  { id: 6, name: 'Portuguese' },
  { id: 7, name: 'Russian' },
  { id: 8, name: 'Hindi' },
  { id: 9, name: 'Chinese' },
  { id: 10, name: 'Arabic' },
];

/** Languages from legacy language_values — same IDs stored in countries.country_lang_id. */
export async function fetchOutcomeLanguages(): Promise<OutcomeLanguage[]> {
  const langTable = await findExistingTable(LANGUAGE_TABLE_CANDIDATES);
  if (langTable) {
    const columns = await getTableColumns(langTable);
    const nameCol = columns.has('lang_value')
      ? 'lang_value'
      : columns.has('language')
        ? 'language'
        : columns.has('name')
          ? 'name'
          : columns.has('lang_name')
            ? 'lang_name'
            : null;

    if (nameCol) {
      const rows = await prisma.$queryRawUnsafe<{ id: number | string; name: string }[]>(
        `SELECT id, \`${nameCol}\` AS name
         FROM \`${langTable}\`
         ORDER BY id ASC`
      );

      if (rows.length > 0) {
        return rows.map((row) => ({
          id: Number(row.id),
          name: text(row.name) || `Language ${row.id}`,
        }));
      }
    }
  }

  const prismaLangs = await prisma.language.findMany({
    where: { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
    select: { name: true, code: true },
  });

  if (prismaLangs.length > 0) {
    return prismaLangs.map((lang, index) => ({
      id: index + 1,
      name: lang.name || lang.code,
    }));
  }

  return LEGACY_OUTCOME_LANGUAGES;
}

export async function getValidOutcomeLanguageIds(): Promise<number[]> {
  const languages = await fetchOutcomeLanguages();
  return languages.map((lang) => lang.id);
}

/** Resolve country language for a user via users.country_id → countries.country_lang_id. */
export async function getCountryLanguageIdForUserIds(userIds: string[]): Promise<number | null> {
  if (userIds.length === 0) return null;

  const usersTable = await findExistingTable(['users_new', 'users']);
  const countriesTable = await findExistingTable(['countries', 'country']);
  if (!usersTable || !countriesTable) return null;

  const userPlaceholders = userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ country_lang_id: number | string | null }[]>(
    `SELECT c.country_lang_id
     FROM \`${usersTable}\` u
     INNER JOIN \`${countriesTable}\` c ON c.id = u.country_id
     WHERE u.id IN (${userPlaceholders})
     LIMIT 1`,
    ...userIds
  );

  const lang = Number(rows[0]?.country_lang_id ?? 0);
  return Number.isFinite(lang) && lang > 0 ? lang : null;
}

export async function normalizeOutcomeLanguageId(langId: number): Promise<number> {
  const validIds = await getValidOutcomeLanguageIds();
  if (validIds.includes(langId)) return langId;
  return validIds.includes(1) ? 1 : validIds[0] ?? 1;
}

async function getClubDefaultOutcomeLanguage(clubIds: string[]): Promise<'custom' | 'default'> {
  const clubsTable = await findExistingTable(CLUBS_TABLE_CANDIDATES);
  if (!clubsTable || clubIds.length === 0) return 'default';

  const columns = await getTableColumns(clubsTable);
  if (!columns.has('default_outcome_language')) return 'default';

  for (const clubId of clubIds) {
    const rows = await prisma.$queryRawUnsafe<{ default_outcome_language: string | null }[]>(
      `SELECT default_outcome_language
       FROM \`${clubsTable}\`
       WHERE id = ?
       LIMIT 1`,
      clubId
    );
    if (text(rows[0]?.default_outcome_language) === 'custom') return 'custom';
  }

  return 'default';
}

async function clubUsesMemberCountryLanguage(clubIds: string[]): Promise<boolean> {
  const table = await findExistingTable([ACCESS_SETTINGS_TABLE]);
  if (!table || clubIds.length === 0) return false;

  const columns = await getTableColumns(table);
  const checks = [
    'detail_of_outcome_country_language',
    'outcome_message_fleshes_country_language',
    'enable_audio_messages_country_language',
    'custom_detail_of_outcome_country_language',
    'custom_outcome_message_fleshes_country_language',
    'custom_enable_audio_messages_country_language',
  ].filter((col) => columns.has(col));

  if (checks.length === 0) return false;

  const clubPlaceholders = clubIds.map(() => '?').join(',');
  const flagRows = await prisma.$queryRawUnsafe<Record<string, string | null>[]>(
    `SELECT ${checks.join(', ')}
     FROM \`${table}\`
     WHERE club_id IN (${clubPlaceholders})
     LIMIT 1`,
    ...clubIds
  );

  const row = flagRows[0];
  if (!row) return false;

  return checks.some((col) => {
    const val = text(row[col]).toUpperCase();
    return val === 'Y' || val === '1' || val === 'TRUE';
  });
}

export async function resolveOutcomeLanguage(params: {
  clubIds: string[];
  clubOwnerUserIds: string[];
  memberUserIds?: string[];
  languageMode?: 'auto' | 'primary' | 'country' | 'custom';
}): Promise<{ languageId: number; source: OutcomeMessageSource; countryLanguageId: number | null }> {
  const mode = params.languageMode ?? 'auto';
  const defaultOutcomeLanguage = await getClubDefaultOutcomeLanguage(params.clubIds);

  if (mode === 'custom' || (mode === 'auto' && defaultOutcomeLanguage === 'custom')) {
    return { languageId: 0, source: 'club_custom', countryLanguageId: null };
  }

  const memberCountryLang =
    params.memberUserIds && params.memberUserIds.length > 0
      ? await getCountryLanguageIdForUserIds(params.memberUserIds)
      : null;

  const useMemberCountry =
    mode === 'country' ||
    (mode === 'auto' &&
      memberCountryLang != null &&
      (await clubUsesMemberCountryLanguage(params.clubIds)));

  if (useMemberCountry && memberCountryLang != null) {
    return {
      languageId: await normalizeOutcomeLanguageId(memberCountryLang),
      source: 'member_country',
      countryLanguageId: memberCountryLang,
    };
  }

  const clubPrimaryLang = await getCountryLanguageIdForUserIds(params.clubOwnerUserIds);
  const languageId = await normalizeOutcomeLanguageId(clubPrimaryLang ?? 1);

  return {
    languageId,
    source: 'club_primary',
    countryLanguageId: memberCountryLang,
  };
}

export async function fetchAccessOutcomeMessage(params: {
  languageId: number;
  source: OutcomeMessageSource;
  clubIds?: string[];
  messageTypeId?: string;
  code?: string;
  clubStorageId?: string;
}): Promise<ResolvedOutcomeMessage | null> {
  const typeTable = await findExistingTable(TYPE_TABLE_CANDIDATES);
  if (!typeTable) return null;

  const settingsTable =
    params.source === 'club_custom'
      ? await findExistingTable(CLUB_AUDIO_CANDIDATES)
      : await findExistingTable(AUDIO_SETTINGS_CANDIDATES);

  if (!settingsTable) return null;

  const typeCols = await getTableColumns(typeTable);
  const settingsCols = await getTableColumns(settingsTable);
  const defaultCodeCol = typeCols.has('default_msg_code') ? 'default_msg_code' : null;
  const codeFilter = text(params.code);
  const typeIdFilter = text(params.messageTypeId);

  let typeRow: { id: number | string; defaultCode: string | null } | null = null;

  if (typeIdFilter) {
    const rows = await prisma.$queryRawUnsafe<{ id: number | string; defaultCode: string | null }[]>(
      `SELECT id${defaultCodeCol ? `, COALESCE(\`${defaultCodeCol}\`, '') AS defaultCode` : ", '' AS defaultCode"}
       FROM \`${typeTable}\`
       WHERE id = ?
       LIMIT 1`,
      typeIdFilter
    );
    typeRow = rows[0] ?? null;
  } else if (codeFilter && settingsCols.has('code')) {
    const codeMatch = defaultCodeCol
      ? `(s.code = ? OR t.\`${defaultCodeCol}\` = ?)`
      : 's.code = ?';
    const codeParams = defaultCodeCol ? [codeFilter, codeFilter] : [codeFilter];
    const rows = await prisma.$queryRawUnsafe<
      { id: number | string; defaultCode: string | null }[]
    >(
      `SELECT t.id AS id${
        defaultCodeCol ? `, COALESCE(t.\`${defaultCodeCol}\`, '') AS defaultCode` : ", '' AS defaultCode"
      }
       FROM \`${typeTable}\` t
       LEFT JOIN \`${settingsTable}\` s
         ON s.message_type_id = t.id AND s.language = ?
       WHERE ${codeMatch}
       LIMIT 1`,
      params.languageId,
      ...codeParams
    );
    typeRow = rows[0] ?? null;
  }

  if (!typeRow) return null;

  const typeId = String(typeRow.id);
  const joinConditions = ['s.message_type_id = t.id', 's.language = ?'];
  const joinParams: unknown[] = [params.languageId];

  if (params.source === 'club_custom' && settingsCols.has('club_id') && params.clubIds?.length) {
    const clubPlaceholders = params.clubIds.map(() => '?').join(',');
    joinConditions.push(`s.club_id IN (${clubPlaceholders})`);
    joinParams.push(...params.clubIds);
  }

  const messageSelect = settingsCols.has('message')
    ? `COALESCE(s.message, '') AS message`
    : "'' AS message";
  const codeSelect = settingsCols.has('code')
    ? `COALESCE(s.code, '') AS code`
    : defaultCodeCol
      ? `COALESCE(t.\`${defaultCodeCol}\`, '') AS code`
      : "'' AS code";
  const audioSelect = settingsCols.has('audio') ? 's.audio AS audio' : 'NULL AS audio';

  const rows = await prisma.$queryRawUnsafe<
    {
      message: string | null;
      code: string | null;
      audio: string | null;
      defaultCode: string | null;
    }[]
  >(
    `SELECT
      ${messageSelect},
      ${codeSelect},
      ${audioSelect},
      ${defaultCodeCol ? `COALESCE(t.\`${defaultCodeCol}\`, '') AS defaultCode` : "'' AS defaultCode"}
     FROM \`${typeTable}\` t
     LEFT JOIN \`${settingsTable}\` s ON ${joinConditions.join(' AND ')}
     WHERE t.id = ?
     LIMIT 1`,
    ...joinParams,
    typeId
  );

  const row = rows[0];
  if (!row) return null;

  const defaultCode = text(row.defaultCode);
  const resolvedCode = text(row.code) || defaultCode;
  const audioFile = row.audio ? text(row.audio) : null;
  const clubStorageId = params.clubStorageId ?? params.clubIds?.[0] ?? 'default';

  const audioUrl = audioFile
    ? params.source === 'club_custom'
      ? `/outcome_messages/club/${clubStorageId}/${audioFile}`
      : audioPublicPath(params.languageId, audioFile)
    : null;

  return {
    messageTypeId: typeId,
    code: resolvedCode,
    message: text(row.message),
    audioFile,
    audioUrl,
    languageId: params.languageId,
    source: params.source,
    countryLanguageId: null,
  };
}

export async function resolveAccessOutcomeMessage(params: {
  clubIds: string[];
  clubOwnerUserIds: string[];
  memberUserIds?: string[];
  messageTypeId?: string;
  code?: string;
  languageMode?: 'auto' | 'primary' | 'country' | 'custom';
  clubStorageId?: string;
}): Promise<(ResolvedOutcomeMessage & { countryLanguageId: number | null }) | null> {
  const { languageId, source, countryLanguageId } = await resolveOutcomeLanguage({
    clubIds: params.clubIds,
    clubOwnerUserIds: params.clubOwnerUserIds,
    memberUserIds: params.memberUserIds,
    languageMode: params.languageMode,
  });

  const message = await fetchAccessOutcomeMessage({
    languageId,
    source,
    clubIds: params.clubIds,
    messageTypeId: params.messageTypeId,
    code: params.code,
    clubStorageId: params.clubStorageId,
  });

  if (!message) return null;

  return { ...message, countryLanguageId };
}
