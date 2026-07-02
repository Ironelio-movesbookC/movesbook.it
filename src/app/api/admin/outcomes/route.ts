import { NextRequest, NextResponse } from 'next/server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolvePublicPath, verifyPublicFile } from '@/lib/serverPublicDir';
import { audioPublicPath, outcomeService } from '@/lib/outcomes';
import { mapLegacyLanguageTabs } from '@/lib/outcomes/types';

export const dynamic = 'force-dynamic';

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

function parseLangParam(request: NextRequest): number {
  const languageId = request.nextUrl.searchParams.get('languageId');
  const langParam = request.nextUrl.searchParams.get('lang');
  if (languageId === 'default' || languageId === '0') return 0;
  if (languageId) {
    const legacy = Number(languageId);
    if (Number.isFinite(legacy) && legacy >= 0) return legacy;
  }
  const parsed = Number(langParam ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function parseLangBody(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function text(value: unknown): string {
  return String(value ?? '').trim();
}

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const lang = parseLangParam(request);
    const languages = await outcomeService.listLanguages();
    const items = await outcomeService.fetchAdminItems(lang);

    return NextResponse.json({
      lang,
      languageId: lang === 0 ? 'default' : String(lang),
      isDefaultLang: lang === 0,
      languages: mapLegacyLanguageTabs(languages).map((tab) => {
        const lang = languages.find((l) => l.legacyLangId === tab.id);
        return { ...tab, languageId: lang?.id ?? null };
      }),
      introParagraph:
        lang === 0
          ? 'Edit descriptions and codes on the Default tab. These defaults apply across all languages.'
          : 'Messages on this tab are shown when the resolved language matches this tab. Edit message and audio here; description and code come from the Default tab unless overridden on save.',
      items,
    });
  } catch (error) {
    console.error('GET /api/admin/outcomes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  return PATCH(request);
}

export async function PATCH(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const action = text(body.action) || 'save-setting';
    const lang = parseLangBody(body.lang ?? body.languageId);

    if (action === 'save-description') {
      if (lang !== 0) {
        return NextResponse.json({ error: 'Descriptions can only be edited on the Default tab.' }, { status: 400 });
      }
      await outcomeService.saveAdminTypeDescription(text(body.typeId), text(body.description));
      return NextResponse.json({ success: true, message: 'Description successfully updated' });
    }

    if (action === 'save-setting') {
      const id = await outcomeService.saveAdminSystemOutcome({
        typeId: text(body.typeId),
        settingId: body.settingId != null ? text(body.settingId) : null,
        lang,
        code: text(body.code),
        message: text(body.message),
      });
      return NextResponse.json({
        success: true,
        message: body.settingId ? 'Outcome successfully updated' : 'Outcome successfully added',
        id,
      });
    }

    if (action === 'remove-audio') {
      const settingId = text(body.settingId);
      const langKey = parseLangBody(body.lang);
      const rows = await prisma.systemOutcome.findUnique({ where: { id: settingId } });
      if (rows?.audioFile && langKey > 0) {
        try {
          await unlink(resolvePublicPath('outcome_messages', String(langKey), rows.audioFile));
        } catch {
          /* missing file */
        }
      }
      await outcomeService.setSystemOutcomeAudio(settingId, null);
      return NextResponse.json({ success: true, message: 'Audio successfully deleted!' });
    }

    return NextResponse.json({ error: 'Unrecognized action.' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/admin/outcomes:', error);
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status =
      message === 'Language not found' || message.includes('can only be edited') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin(request);
    if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const settingId = text(body.settingId);
    const lang = parseLangBody(body.lang ?? body.languageId);
    const fileData = text(body.file);

    if (!settingId || !fileData.startsWith('data:')) {
      return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
    }

    const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: 'Invalid file format.' }, { status: 400 });

    const mime = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const ext = mime.includes('wav') ? 'wav' : mime.includes('mpeg') || mime.includes('mp3') ? 'mp3' : null;
    if (!ext) {
      return NextResponse.json({
        error: 'Something wrong happened when tried to upload file. File allowed are .mp3 or .wav',
      }, { status: 400 });
    }

    const existing = await prisma.systemOutcome.findUnique({ where: { id: settingId } });
    if (existing?.audioFile) {
      return NextResponse.json({
        error: 'Please remove the existing audio before uploading a new file.',
      }, { status: 400 });
    }

    const filename = `${Date.now()}.${ext}`;
    const dir = resolvePublicPath('outcome_messages', String(lang));
    await mkdir(dir, { recursive: true });
    const savedPath = path.join(dir, filename);
    await writeFile(savedPath, buffer);

    if (!(await verifyPublicFile(savedPath))) {
      return NextResponse.json(
        { error: 'Audio upload could not be verified on disk.' },
        { status: 500 }
      );
    }

    await outcomeService.setSystemOutcomeAudio(settingId, filename);

    return NextResponse.json({
      success: true,
      message: 'Audio successfully saved',
      filename,
      audioUrl: audioPublicPath(lang, filename),
    });
  } catch (error) {
    console.error('POST /api/admin/outcomes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
