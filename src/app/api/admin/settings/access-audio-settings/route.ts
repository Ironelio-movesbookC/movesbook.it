import { NextRequest, NextResponse } from 'next/server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  fetchAccessAudioItems,
  fetchLanguages,
  findExistingTable,
  getTableColumns,
  seedTypesIfEmpty,
  text,
} from '@/lib/adminAccessAudioSettings';

export const dynamic = 'force-dynamic';

const TYPE_TABLE_CANDIDATES = ['audio_setting_types', 'audio_setting_type'];
const AUDIO_SETTINGS_CANDIDATES = ['audio_settings', 'audio_setting'];
const DESC_TABLE_CANDIDATES = [
  'audio_setting_type_descriptions',
  'audio_setting_type_description',
];

async function requireAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded?.userId) return null;

  const superAdmin = await prisma.superAdmin.findFirst({
    where: { id: decoded.userId, isActive: true },
    select: { id: true },
  });
  if (superAdmin) return { userId: decoded.userId };

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { userType: true },
  });
  if (user?.userType === 'ADMIN') return { userId: decoded.userId };

  return null;
}

function parseLang(value: string | null): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const lang = parseLang(request.nextUrl.searchParams.get('lang'));
    await seedTypesIfEmpty();

    const languages = await fetchLanguages();
    const items = await fetchAccessAudioItems(lang);

    return NextResponse.json({
      lang,
      isDefaultLang: lang === 0,
      languages,
      introParagraph:
        lang === 0
          ? 'Edit descriptions and codes on the Default tab. These defaults apply across all languages.'
          : 'Messages on this tab are shown to members whose country/nationality uses this language (countries.country_lang_id). Only the message and audio can be edited here; description and code come from the Default tab.',
      items,
    });
  } catch (error) {
    console.error('GET /api/admin/settings/access-audio-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const action = text(body.action);
    const lang = parseLang(body.lang != null ? String(body.lang) : '0');

    if (action === 'save-description') {
      if (lang !== 0) {
        return NextResponse.json(
          { error: 'Descriptions can only be edited on the Default tab.' },
          { status: 400 }
        );
      }

      const typeTable = await findExistingTable(TYPE_TABLE_CANDIDATES);
      if (!typeTable) {
        return NextResponse.json({ error: 'Message types table not found.' }, { status: 404 });
      }

      const typeId = text(body.typeId);
      const description = text(body.description);
      const typeCols = await getTableColumns(typeTable);
      const descCol = typeCols.has('message_description')
        ? 'message_description'
        : typeCols.has('description')
          ? 'description'
          : null;

      if (!descCol) {
        return NextResponse.json({ error: 'Description column not found.' }, { status: 400 });
      }

      await prisma.$executeRawUnsafe(
        `UPDATE \`${typeTable}\` SET \`${descCol}\` = ? WHERE id = ?`,
        description,
        typeId
      );

      return NextResponse.json({ success: true, message: 'Description successfully updated' });
    }

    if (action === 'save-setting') {
      const settingsTable = await findExistingTable(AUDIO_SETTINGS_CANDIDATES);
      if (!settingsTable) {
        return NextResponse.json({ error: 'Audio settings table not found.' }, { status: 404 });
      }

      const typeId = text(body.typeId);
      const settingId = body.settingId != null ? text(body.settingId) : '';
      const message = text(body.message);
      let code = text(body.code);

      const typeTable = await findExistingTable(TYPE_TABLE_CANDIDATES);
      const typeCols = typeTable ? await getTableColumns(typeTable) : new Set<string>();
      if (!code && typeCols.has('default_msg_code')) {
        const typeRows = await prisma.$queryRawUnsafe<{ default_msg_code: string }[]>(
          `SELECT default_msg_code FROM \`${typeTable}\` WHERE id = ? LIMIT 1`,
          typeId
        );
        code = text(typeRows[0]?.default_msg_code);
      }

      const columns = await getTableColumns(settingsTable);

      if (settingId) {
        const updates: string[] = [];
        const values: unknown[] = [];
        if (columns.has('message')) {
          updates.push('message = ?');
          values.push(message);
        }
        if (lang === 0 && columns.has('code')) {
          updates.push('code = ?');
          values.push(code);
        }
        if (updates.length === 0) {
          return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
        }
        await prisma.$executeRawUnsafe(
          `UPDATE \`${settingsTable}\` SET ${updates.join(', ')} WHERE id = ?`,
          ...values,
          settingId
        );

        if (lang === 0 && typeTable && typeCols.has('default_msg_code') && code) {
          await prisma.$executeRawUnsafe(
            `UPDATE \`${typeTable}\` SET default_msg_code = ? WHERE id = ?`,
            code,
            typeId
          );
        }

        return NextResponse.json({ success: true, message: 'Audio setting successfully updated', id: settingId });
      }

      const resolvedCode =
        lang === 0
          ? code
          : typeTable && typeCols.has('default_msg_code')
            ? text(
                (
                  await prisma.$queryRawUnsafe<{ default_msg_code: string }[]>(
                    `SELECT default_msg_code FROM \`${typeTable}\` WHERE id = ? LIMIT 1`,
                    typeId
                  )
                )[0]?.default_msg_code
              ) || code
            : code;

      const insertFields: Record<string, unknown> = {
        language: lang,
        message_type_id: Number(typeId) || typeId,
        message,
        code: text(resolvedCode) || code,
      };
      const fieldNames = Object.keys(insertFields).filter((key) => columns.has(key));
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`${settingsTable}\` (${fieldNames.map((f) => `\`${f}\``).join(', ')})
         VALUES (${fieldNames.map(() => '?').join(', ')})`,
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

      const settingsTable = await findExistingTable(AUDIO_SETTINGS_CANDIDATES);
      if (!settingsTable || !(await getTableColumns(settingsTable)).has('audio')) {
        return NextResponse.json({ error: 'Settings table not found.' }, { status: 404 });
      }

      const rows = await prisma.$queryRawUnsafe<{ audio: string | null }[]>(
        `SELECT audio FROM \`${settingsTable}\` WHERE id = ? LIMIT 1`,
        settingId
      );
      const audioFile = text(rows[0]?.audio);
      if (audioFile) {
        const filePath = path.join(process.cwd(), 'public', 'outcome_messages', String(lang), audioFile);
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
    console.error('PATCH /api/admin/settings/access-audio-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const settingId = text(body.settingId);
    const lang = parseLang(body.lang != null ? String(body.lang) : '0');
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

    const settingsTable = await findExistingTable(AUDIO_SETTINGS_CANDIDATES);
    if (!settingsTable) {
      return NextResponse.json({ error: 'Settings table not found.' }, { status: 404 });
    }

    const existing = await prisma.$queryRawUnsafe<{ audio: string | null }[]>(
      `SELECT audio FROM \`${settingsTable}\` WHERE id = ? LIMIT 1`,
      settingId
    );
    if (text(existing[0]?.audio)) {
      return NextResponse.json({
        error: 'Please remove the existing audio before uploading a new file.',
      }, { status: 400 });
    }

    const filename = `${Date.now()}.${ext}`;
    const dir = path.join(process.cwd(), 'public', 'outcome_messages', String(lang));
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, filename), buffer);

    await prisma.$executeRawUnsafe(
      `UPDATE \`${settingsTable}\` SET audio = ? WHERE id = ?`,
      filename,
      settingId
    );

    return NextResponse.json({
      success: true,
      message: 'Audio successfully saved',
      filename,
      audioUrl: `/outcome_messages/${lang}/${filename}`,
    });
  } catch (error) {
    console.error('POST /api/admin/settings/access-audio-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
