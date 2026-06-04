import { NextRequest, NextResponse } from 'next/server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolvePublicPath, verifyPublicFile } from '@/lib/serverPublicDir';
import { seedOutcomeSettingsIfEmpty } from '@/lib/outcomeSettingsSeed';
import type { OutcomeSettingItem, OutcomeSettingsTab } from '@/types/clubOutcomeSettings';

export const dynamic = 'force-dynamic';

const TYPE_TABLE_CANDIDATES = ['audio_setting_types', 'audio_setting_type'];
const AUDIO_SETTINGS_CANDIDATES = ['audio_settings', 'audio_setting'];
const CLUB_AUDIO_CANDIDATES = ['club_audio_settings', 'club_audio_setting'];
const CLUBS_TABLE_CANDIDATES = ['clubs'];

const INTRO_PRIMARY =
  'Fixed settings in your primary language. These messages are managed centrally for your country language and are shown read-only here.';
const INTRO_CUSTOM =
  'Custom settings in your language. Edit codes and messages below; changes save automatically. You can upload audio files (.mp3 or .wav) for each message.';

function text(value: unknown): string {
  return String(value ?? '').trim();
}

function isClubAccountUserType(userType: string): boolean {
  return userType === 'CLUB' || userType === 'CLUB_TRAINER';
}

function getTokenPayload(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token);
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

async function getLegacyClubId(clubId: string): Promise<string | null> {
  const mappingTable = await findExistingTable(['legacy_id_mappings']);
  if (!mappingTable) return null;

  const rows = await prisma.$queryRawUnsafe<{ legacy_id: number | string }[]>(
    `SELECT legacy_id
     FROM \`${mappingTable}\`
     WHERE new_id = ?
       AND legacy_table = 'clubs'
     ORDER BY legacy_id DESC
     LIMIT 1`,
    clubId
  );

  return rows[0]?.legacy_id != null ? String(rows[0].legacy_id) : null;
}

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.$queryRaw<{ id: string; name: string }[]>`
      SELECT id, name
      FROM clubs_new
      WHERE id = ${requestedClubId}
        AND adminId = ${userId}
      LIMIT 1
    `;
    if (selected[0]) return selected[0];
  }

  const fallback = await prisma.$queryRaw<{ id: string; name: string }[]>`
    SELECT id, name
    FROM clubs_new
    WHERE adminId = ${userId}
    ORDER BY createdAt DESC
    LIMIT 1
  `;

  return fallback[0] ?? null;
}

async function getAuthorizedContext(request: NextRequest) {
  const decoded = getTokenPayload(request);
  if (!decoded?.userId || !decoded.userType) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  if (!isClubAccountUserType(String(decoded.userType))) {
    return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  const userId = String(decoded.userId);
  const requestedClubId = request.nextUrl.searchParams.get('clubId');
  const club = await getOwnedClub(userId, requestedClubId);
  const legacyUserId = await getLegacyUserId(userId);
  const userIds = Array.from(new Set([userId, legacyUserId].filter(Boolean) as string[]));
  const legacyClubId = club ? await getLegacyClubId(club.id) : null;
  const clubIdsForQuery = Array.from(new Set([club?.id, legacyClubId].filter(Boolean) as string[]));

  return { userId, legacyUserId, club, userIds, legacyClubId, clubIdsForQuery };
}

async function getPrimaryLanguageId(userIds: string[]): Promise<number> {
  const usersTable = await findExistingTable(['users_new', 'users']);
  const countriesTable = await findExistingTable(['countries', 'country']);
  if (!usersTable || !countriesTable) return 1;

  const userPlaceholders = userIds.map(() => '?').join(',');
  const rows = await prisma.$queryRawUnsafe<{ country_lang_id: number | string | null }[]>(
    `SELECT c.country_lang_id
     FROM \`${usersTable}\` u
     INNER JOIN \`${countriesTable}\` c ON c.id = u.country_id
     WHERE u.id IN (${userPlaceholders})
     LIMIT 1`,
    ...userIds
  );

  const lang = Number(rows[0]?.country_lang_id ?? 1);
  return Number.isFinite(lang) && lang > 0 ? lang : 1;
}

async function getDefaultOutcomeLanguage(
  clubIds: string[]
): Promise<'custom' | 'default'> {
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
    const val = text(rows[0]?.default_outcome_language);
    if (val === 'custom') return 'custom';
  }

  return 'default';
}

async function setDefaultOutcomeLanguage(
  clubIds: string[],
  value: 'custom' | 'default'
): Promise<boolean> {
  const clubsTable = await findExistingTable(CLUBS_TABLE_CANDIDATES);
  if (!clubsTable || clubIds.length === 0) return false;

  const columns = await getTableColumns(clubsTable);
  if (!columns.has('default_outcome_language')) return false;

  for (const clubId of clubIds) {
    await prisma.$executeRawUnsafe(
      `UPDATE \`${clubsTable}\` SET default_outcome_language = ? WHERE id = ?`,
      value,
      clubId
    );
  }
  return true;
}

function audioPublicPath(clubStorageId: string, filename: string, tab: OutcomeSettingsTab, lang: number): string {
  if (tab === 'custom') {
    return `/outcome_messages/club/${clubStorageId}/${filename}`;
  }
  return `/outcome_messages/${lang}/${filename}`;
}

async function fetchOutcomeItems(
  tab: OutcomeSettingsTab,
  lang: number,
  clubIds: string[],
  clubStorageId: string
): Promise<OutcomeSettingItem[]> {
  const typeTable = await findExistingTable(TYPE_TABLE_CANDIDATES);
  if (!typeTable) return [];

  const settingsTable =
    tab === 'primary'
      ? await findExistingTable(AUDIO_SETTINGS_CANDIDATES)
      : await findExistingTable(CLUB_AUDIO_CANDIDATES);

  const typeCols = await getTableColumns(typeTable);
  const descCol = typeCols.has('message_description')
    ? 'message_description'
    : typeCols.has('description')
      ? 'description'
      : 'name';
  const defaultCodeCol = typeCols.has('default_msg_code') ? 'default_msg_code' : null;

  if (!settingsTable) {
    const types = await prisma.$queryRawUnsafe<
      { id: number | string; description: string | null; defaultCode: string | null }[]
    >(
      `SELECT id, COALESCE(\`${descCol}\`, '') AS description${
        defaultCodeCol ? `, COALESCE(\`${defaultCodeCol}\`, '') AS defaultCode` : ", '' AS defaultCode"
      }
       FROM \`${typeTable}\`
       ORDER BY id ASC`
    );
    return types.map((t) => ({
      typeId: String(t.id),
      settingId: null,
      description: text(t.description),
      code: text(t.defaultCode),
      defaultCode: text(t.defaultCode),
      message: '',
      audioFile: null,
      audioUrl: null,
    }));
  }

  const settingsCols = await getTableColumns(settingsTable);
  const joinAlias = 's';
  const joinConditions = [`${joinAlias}.message_type_id = t.id`, `${joinAlias}.language = ?`];
  const joinParams: unknown[] = [lang];

  if (tab === 'custom' && settingsCols.has('club_id') && clubIds.length > 0) {
    const clubPlaceholders = clubIds.map(() => '?').join(',');
    joinConditions.push(`${joinAlias}.club_id IN (${clubPlaceholders})`);
    joinParams.push(...clubIds);
  }

  const codeSelect = settingsCols.has('code') ? `COALESCE(${joinAlias}.code, '') AS code` : "'' AS code";
  const messageSelect = settingsCols.has('message')
    ? `COALESCE(${joinAlias}.message, '') AS message`
    : "'' AS message";
  const audioSelect = settingsCols.has('audio')
    ? `${joinAlias}.audio AS audio`
    : 'NULL AS audio';
  const idSelect = settingsCols.has('id') ? `${joinAlias}.id AS settingId` : 'NULL AS settingId';

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
    LEFT JOIN \`${settingsTable}\` ${joinAlias}
      ON ${joinConditions.join(' AND ')}
    ORDER BY t.id ASC`,
    ...joinParams
  );

  return rows.map((row) => {
    const defaultCode = text(row.defaultCode);
    const code = text(row.code) || defaultCode;
    const audioFile = row.audio ? text(row.audio) : null;
    return {
      typeId: String(row.typeId),
      settingId: row.settingId != null ? String(row.settingId) : null,
      description: text(row.description),
      code,
      defaultCode,
      message: text(row.message),
      audioFile,
      audioUrl: audioFile ? audioPublicPath(clubStorageId, audioFile, tab, lang) : null,
    };
  });
}

function clubStorageFolder(clubIds: string[]): string {
  return clubIds[0] ?? 'default';
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const tabParam = request.nextUrl.searchParams.get('tab');
    const tab: OutcomeSettingsTab = tabParam === 'custom' ? 'custom' : 'primary';
    const primaryLanguageId = await getPrimaryLanguageId(auth.userIds);
    const lang = tab === 'custom' ? 0 : primaryLanguageId;
    const clubStorageId = clubStorageFolder(auth.clubIdsForQuery);

    await seedOutcomeSettingsIfEmpty({
      clubIds: auth.clubIdsForQuery,
      primaryLanguageId,
    });

    const defaultOutcomeLanguage = await getDefaultOutcomeLanguage(auth.clubIdsForQuery);
    const items = await fetchOutcomeItems(tab, lang, auth.clubIdsForQuery, clubStorageId);

    return NextResponse.json({
      tab,
      editable: tab === 'custom',
      primaryLanguageId,
      defaultOutcomeLanguage,
      introParagraph: tab === 'custom' ? INTRO_CUSTOM : INTRO_PRIMARY,
      items,
    });
  } catch (error) {
    console.error('GET /api/club/settings/outcome-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const action = text(body.action);

    if (action === 'default-language') {
      const lang = text(body.lang);
      const value: 'custom' | 'default' = lang === 'custom' ? 'custom' : 'default';
      const saved = await setDefaultOutcomeLanguage(auth.clubIdsForQuery, value);
      if (!saved) {
        return NextResponse.json({
          success: true,
          message: 'Preference noted (legacy clubs table not available).',
        });
      }
      return NextResponse.json({
        success: true,
        message: 'The default outcome language was successfully changed.',
      });
    }

    if (action === 'save') {
      const settingsTable = await findExistingTable(CLUB_AUDIO_CANDIDATES);
      if (!settingsTable) {
        return NextResponse.json({ error: 'Custom outcome settings table not found.' }, { status: 404 });
      }

      const typeId = text(body.typeId);
      const settingId = body.settingId != null ? text(body.settingId) : '';
      const code = text(body.code);
      const message = text(body.message);
      const clubId = auth.clubIdsForQuery[0];
      if (!clubId || !typeId) {
        return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
      }

      const columns = await getTableColumns(settingsTable);
      const typeTable = await findExistingTable(TYPE_TABLE_CANDIDATES);
      let resolvedCode = code;
      if (!resolvedCode && typeTable) {
        const typeCols = await getTableColumns(typeTable);
        const defaultCodeCol = typeCols.has('default_msg_code') ? 'default_msg_code' : null;
        if (defaultCodeCol) {
          const typeRows = await prisma.$queryRawUnsafe<{ default_msg_code: string }[]>(
            `SELECT \`${defaultCodeCol}\` AS default_msg_code FROM \`${typeTable}\` WHERE id = ? LIMIT 1`,
            typeId
          );
          resolvedCode = text(typeRows[0]?.default_msg_code);
        }
      }

      if (settingId) {
        const updates: string[] = [];
        const values: unknown[] = [];
        if (columns.has('message')) {
          updates.push('message = ?');
          values.push(message);
        }
        if (columns.has('code')) {
          updates.push('code = ?');
          values.push(resolvedCode);
        }
        if (updates.length === 0) {
          return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
        }
        await prisma.$executeRawUnsafe(
          `UPDATE \`${settingsTable}\` SET ${updates.join(', ')} WHERE id = ?`,
          ...values,
          settingId
        );
        return NextResponse.json({ success: true, message: 'Audio setting successfully updated', id: settingId });
      }

      const insertFields: Record<string, unknown> = {
        language: 0,
        message_type_id: Number(typeId) || typeId,
        club_id: clubId,
        message,
        code: resolvedCode,
      };
      const fieldNames = Object.keys(insertFields).filter((key) => columns.has(key));
      const placeholders = fieldNames.map(() => '?').join(', ');
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${settingsTable}\` (${fieldNames.map((f) => `\`${f}\``).join(', ')})
         VALUES (${placeholders})`,
        ...fieldNames.map((key) => insertFields[key])
      );
      const idRows = await prisma.$queryRawUnsafe<{ id: bigint | number | string }[]>(
        'SELECT LAST_INSERT_ID() AS id'
      );
      const newId = idRows[0]?.id != null ? String(idRows[0].id) : null;
      return NextResponse.json({
        success: true,
        message: 'Audio setting successfully added',
        id: newId,
      });
    }

    if (action === 'remove-audio') {
      const settingId = text(body.settingId);
      if (!settingId) {
        return NextResponse.json({ error: 'Invalid setting.' }, { status: 400 });
      }

      const settingsTable = await findExistingTable(CLUB_AUDIO_CANDIDATES);
      if (!settingsTable || !(await getTableColumns(settingsTable)).has('audio')) {
        return NextResponse.json({ error: 'Settings table not found.' }, { status: 404 });
      }

      const clubPlaceholders = auth.clubIdsForQuery.map(() => '?').join(',');
      const rows = await prisma.$queryRawUnsafe<{ audio: string | null }[]>(
        `SELECT audio FROM \`${settingsTable}\`
         WHERE id = ? AND club_id IN (${clubPlaceholders})
         LIMIT 1`,
        settingId,
        ...auth.clubIdsForQuery
      );
      const audioFile = text(rows[0]?.audio);
      if (audioFile) {
        const filePath = resolvePublicPath(
          'outcome_messages',
          'club',
          clubStorageFolder(auth.clubIdsForQuery),
          audioFile
        );
        try {
          await unlink(filePath);
        } catch {
          /* file may already be missing */
        }
      }

      await prisma.$executeRawUnsafe(
        `UPDATE \`${settingsTable}\` SET audio = NULL WHERE id = ?`,
        settingId
      );

      return NextResponse.json({ success: true, message: 'Audio successfully deleted!' });
    }

    return NextResponse.json({ error: 'Unrecognized action.' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/club/settings/outcome-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const body = await request.json();
    const settingId = text(body.settingId);
    const fileData = text(body.file);

    if (!settingId || !fileData.startsWith('data:')) {
      return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
    }

    const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: 'Invalid file format.' }, { status: 400 });
    }

    const mime = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const ext = mime.includes('wav') ? 'wav' : mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : null;
    if (!ext) {
      return NextResponse.json({
        error: 'Something wrong happened when tried to upload file. File allowed are .mp3 or .wav',
      }, { status: 400 });
    }

    const settingsTable = await findExistingTable(CLUB_AUDIO_CANDIDATES);
    if (!settingsTable) {
      return NextResponse.json({ error: 'Settings table not found.' }, { status: 404 });
    }

    const clubPlaceholders = auth.clubIdsForQuery.map(() => '?').join(',');
    const existing = await prisma.$queryRawUnsafe<{ audio: string | null }[]>(
      `SELECT audio FROM \`${settingsTable}\`
       WHERE id = ? AND club_id IN (${clubPlaceholders})
       LIMIT 1`,
      settingId,
      ...auth.clubIdsForQuery
    );
    if (text(existing[0]?.audio)) {
      return NextResponse.json({
        error: 'Please remove the existing audio before uploading a new file.',
      }, { status: 400 });
    }

    const filename = `${Date.now()}.${ext}`;
    const dir = resolvePublicPath(
      'outcome_messages',
      'club',
      clubStorageFolder(auth.clubIdsForQuery)
    );
    await mkdir(dir, { recursive: true });
    const savedPath = path.join(dir, filename);
    await writeFile(savedPath, buffer);

    if (!(await verifyPublicFile(savedPath))) {
      return NextResponse.json(
        { error: 'Audio upload could not be verified on disk. Check server public directory configuration.' },
        { status: 500 }
      );
    }

    await prisma.$executeRawUnsafe(
      `UPDATE \`${settingsTable}\` SET audio = ? WHERE id = ?`,
      filename,
      settingId
    );

    return NextResponse.json({ success: true, message: 'Audio successfully saved' });
  } catch (error) {
    console.error('POST /api/club/settings/outcome-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
