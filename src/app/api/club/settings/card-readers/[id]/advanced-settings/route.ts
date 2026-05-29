import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  ADVANCED_SETTINGS_SKIP_COLUMNS,
  CARD_READER_ADVANCED_MODES,
  humanizeFieldName,
  isYesNoField,
} from '@/lib/cardReaderAdvancedSettings';
import {
  assertReaderAccess,
  getAuthorizedContext,
  getTableColumns,
  text,
} from '@/lib/clubCardReadersApi';

export const dynamic = 'force-dynamic';

const READER_TYPE_TABLE_CANDIDATES = ['club_card_reader_types', 'club_card_reader_type'];
const CONTROL_MODE_TABLE_CANDIDATES = ['club_card_control_modes', 'club_card_control_mode'];

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

type RouteContext = { params: { id: string } };

type SettingsField = {
  key: string;
  label: string;
  value: string;
  fieldType: 'text' | 'checkbox';
};

function buildFields(row: Record<string, unknown>, columns: Set<string>): SettingsField[] {
  const fields: SettingsField[] = [];
  for (const key of columns) {
    if (ADVANCED_SETTINGS_SKIP_COLUMNS.has(key)) continue;
    const raw = row[key];
    const value = raw == null ? '' : String(raw);
    fields.push({
      key,
      label: humanizeFieldName(key),
      value,
      fieldType: isYesNoField(raw) || value === 'Y' || value === 'N' ? 'checkbox' : 'text',
    });
  }
  return fields;
}

async function fetchReaderSummary(readerTable: string, readerId: string) {
  const typeTable = await findExistingTable(READER_TYPE_TABLE_CANDIDATES);
  const modeTable = await findExistingTable(CONTROL_MODE_TABLE_CANDIDATES);
  const typeJoin = typeTable
    ? `LEFT JOIN \`${typeTable}\` rt ON rt.id = r.reader_type_id`
    : '';
  const modeJoin = modeTable
    ? `LEFT JOIN \`${modeTable}\` cm ON cm.id = r.control_mode_id`
    : '';
  const typeSelect = typeTable ? 'COALESCE(rt.name, \'\') AS readerType' : '\'\' AS readerType';
  const modeSelect = modeTable ? 'COALESCE(cm.name, \'\') AS controlMode' : '\'\' AS controlMode';

  const rows = await prisma.$queryRawUnsafe<
    {
      readerNumber: number | string | null;
      readerTypeId: number | string | null;
      controlModeId: number | string | null;
      readerType: string | null;
      controlMode: string | null;
      description: string | null;
    }[]
  >(
    `SELECT
      r.reader_number AS readerNumber,
      r.reader_type_id AS readerTypeId,
      r.control_mode_id AS controlModeId,
      ${typeSelect},
      ${modeSelect},
      COALESCE(r.description, '') AS description
    FROM \`${readerTable}\` r
    ${typeJoin}
    ${modeJoin}
    WHERE r.id = ?
    LIMIT 1`,
    readerId
  );

  return rows[0] ?? null;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    const access = await assertReaderAccess(id, auth.userIds);
    if (!access) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const reader = await fetchReaderSummary(access.readerTable, id);
    if (!reader) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const controlModeId = Number(reader.controlModeId ?? 0);
    const modeConfig = CARD_READER_ADVANCED_MODES[controlModeId];
    if (!modeConfig) {
      return NextResponse.json(
        { error: 'Advanced settings are not available for this control mode.' },
        { status: 400 }
      );
    }

    const settingsTable = await findExistingTable(modeConfig.tableCandidates);
    const readerTypeId = String(reader.readerTypeId ?? '');

    let settingsId: string | null = null;
    let fields: SettingsField[] = [];

    if (settingsTable && readerTypeId) {
      const columns = await getTableColumns(settingsTable);
      const colList = [...columns].map((c) => `\`${c}\``).join(', ');
      const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
        `SELECT ${colList} FROM \`${settingsTable}\` WHERE reader_type_id = ? LIMIT 1`,
        readerTypeId
      );
      if (rows[0]) {
        if (rows[0].id != null) settingsId = String(rows[0].id);
        fields = buildFields(rows[0], columns);
      } else {
        fields = [...columns]
          .filter((key) => !ADVANCED_SETTINGS_SKIP_COLUMNS.has(key))
          .map((key) => ({
            key,
            label: humanizeFieldName(key),
            value: '',
            fieldType: 'text' as const,
          }));
      }
    }

    return NextResponse.json({
      readerId: id,
      controlModeId,
      readerTypeId,
      title: modeConfig.title,
      subtitle: modeConfig.subtitle,
      readerNumber: reader.readerNumber != null ? String(reader.readerNumber) : '',
      readerType: text(reader.readerType),
      controlMode: text(reader.controlMode),
      description: text(reader.description),
      settingsTable,
      settingsId,
      fields,
    });
  } catch (error) {
    console.error('GET /api/club/settings/card-readers/[id]/advanced-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const auth = await getAuthorizedContext(request);
    if ('error' in auth) return auth.error;

    const { id } = context.params;
    const access = await assertReaderAccess(id, auth.userIds);
    if (!access) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const reader = await fetchReaderSummary(access.readerTable, id);
    if (!reader) {
      return NextResponse.json({ error: 'Reader not found.' }, { status: 404 });
    }

    const controlModeId = Number(reader.controlModeId ?? 0);
    const modeConfig = CARD_READER_ADVANCED_MODES[controlModeId];
    if (!modeConfig) {
      return NextResponse.json(
        { error: 'Advanced settings are not available for this control mode.' },
        { status: 400 }
      );
    }

    const settingsTable = await findExistingTable(modeConfig.tableCandidates);
    if (!settingsTable) {
      return NextResponse.json({ error: 'Settings table not found.' }, { status: 404 });
    }

    const body = await request.json();
    const values = (body.values ?? {}) as Record<string, unknown>;
    const settingsId = body.settingsId != null ? String(body.settingsId) : null;
    const readerTypeId = String(reader.readerTypeId ?? '');

    const columns = await getTableColumns(settingsTable);
    const updates: Record<string, unknown> = {};

    for (const [key, raw] of Object.entries(values)) {
      if (!columns.has(key) || ADVANCED_SETTINGS_SKIP_COLUMNS.has(key)) continue;
      if (raw === true || raw === false) {
        updates[key] = raw ? 'Y' : 'N';
      } else {
        updates[key] = raw == null ? '' : String(raw);
      }
    }

    if (settingsId && columns.has('id')) {
      const setClause = Object.keys(updates)
        .map((key) => `\`${key}\` = ?`)
        .join(', ');
      if (setClause) {
        await prisma.$executeRawUnsafe(
          `UPDATE \`${settingsTable}\` SET ${setClause} WHERE id = ?`,
          ...Object.values(updates),
          settingsId
        );
      }
    } else {
      const insertFields: Record<string, unknown> = {
        ...updates,
        reader_type_id: Number(readerTypeId) || 0,
      };
      if (columns.has('club_id') && auth.club?.id) {
        insertFields.club_id = auth.club.id;
      }
      const fieldNames = Object.keys(insertFields).filter((key) => columns.has(key));
      if (fieldNames.length === 0) {
        return NextResponse.json({ error: 'Nothing to save.' }, { status: 400 });
      }
      const placeholders = fieldNames.map(() => '?').join(', ');
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${settingsTable}\` (${fieldNames.map((f) => `\`${f}\``).join(', ')})
         VALUES (${placeholders})`,
        ...fieldNames.map((key) => insertFields[key])
      );
    }

    return NextResponse.json({ success: true, message: 'Reader setting saved successfully.' });
  } catch (error) {
    console.error('PATCH /api/club/settings/card-readers/[id]/advanced-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
