import { NextRequest, NextResponse } from 'next/server';
import { mkdir, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { ClubOutcomeMode } from '@prisma/client';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { resolvePublicPath, verifyPublicFile } from '@/lib/serverPublicDir';
import { clubAudioPublicPath, outcomeService } from '@/lib/outcomes';
import type { OutcomeSettingsTab } from '@/types/clubOutcomeSettings';

export const dynamic = 'force-dynamic';

const INTRO_CUSTOM =
  'Custom settings. Edit codes and messages below; upload .mp3 or .wav audio for each message.';

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

async function getOwnedClub(userId: string, requestedClubId: string | null) {
  if (requestedClubId) {
    const selected = await prisma.club.findFirst({
      where: { id: requestedClubId, adminId: userId },
      select: { id: true, name: true, adminId: true },
    });
    if (selected) return selected;
  }

  return prisma.club.findFirst({
    where: { adminId: userId },
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true, adminId: true },
  });
}

function modeToLegacyDefault(mode: ClubOutcomeMode): 'custom' | 'default' {
  return mode === ClubOutcomeMode.CUSTOM ? 'custom' : 'default';
}

function resolveRequestedClubId(request: NextRequest, body: Record<string, unknown>): string | null {
  const fromQuery = request.nextUrl.searchParams.get('clubId');
  if (fromQuery) return fromQuery;
  if (body.clubId != null) return String(body.clubId);
  return null;
}

function audioExtensionFromUpload(mime: string, fileName?: string): 'mp3' | 'wav' | null {
  const normalized = mime.toLowerCase();
  if (normalized.includes('wav') || normalized.includes('wave')) return 'wav';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'mp3';
  if (fileName) {
    const lower = fileName.toLowerCase();
    if (lower.endsWith('.wav')) return 'wav';
    if (lower.endsWith('.mp3')) return 'mp3';
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const decoded = getTokenPayload(request);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isClubAccountUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = String(decoded.userId);
    const clubId = request.nextUrl.searchParams.get('clubId');
    const club = await getOwnedClub(userId, clubId);
    if (!club) return NextResponse.json({ error: 'Club not found.' }, { status: 404 });

    const tabParam = request.nextUrl.searchParams.get('tab');
    const tab: OutcomeSettingsTab = tabParam === 'custom' ? 'custom' : 'primary';
    const prefs = await outcomeService.getClubPreferences(club.id);
    const legacyLangId = await outcomeService.getLegacyCountryLangIdForClub(club.id);
    const primaryLanguage =
      (await prisma.language.findFirst({ where: { legacyLangId } })) ??
      (await outcomeService.getEnglishLanguage());
    const primaryLanguageName = primaryLanguage?.name ?? 'English';

    const items =
      tab === 'custom'
        ? await outcomeService.fetchClubCustomItems(club.id)
        : await outcomeService.fetchClubPrimaryItems(club.id);

    const introParagraph =
      tab === 'custom'
        ? INTRO_CUSTOM
        : `Fixed settings in your country standard language (${primaryLanguageName}, read-only). Change mode to Custom to edit your own messages.`;

    return NextResponse.json({
      tab,
      editable: tab === 'custom' && prefs.mode === ClubOutcomeMode.CUSTOM,
      primaryLanguageId: legacyLangId,
      primaryLanguageName,
      defaultOutcomeLanguage: modeToLegacyDefault(prefs.mode),
      outcomeMode: prefs.mode,
      introParagraph,
      items,
    });
  } catch (error) {
    console.error('GET /api/club/settings/outcome-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const decoded = getTokenPayload(request);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isClubAccountUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = String(decoded.userId);
    const body = await request.json();
    const clubIdParam = resolveRequestedClubId(request, body);
    const club = await getOwnedClub(userId, clubIdParam);
    if (!club) return NextResponse.json({ error: 'Club not found.' }, { status: 404 });

    const action = text(body.action);

    if (action === 'default-language') {
      const lang = text(body.lang);
      const mode =
        lang === 'custom' ? ClubOutcomeMode.CUSTOM : ClubOutcomeMode.COUNTRY_STANDARD;
      await outcomeService.setClubPreferences(club.id, mode);
      return NextResponse.json({ success: true, message: 'Outcome preference updated.' });
    }

    if (action === 'save') {
      const prefs = await outcomeService.getClubPreferences(club.id);
      if (prefs.mode !== ClubOutcomeMode.CUSTOM) {
        return NextResponse.json({ error: 'Switch to Custom mode to edit messages.' }, { status: 400 });
      }

      const id = await outcomeService.saveClubCustomOutcome({
        clubId: club.id,
        typeId: text(body.typeId),
        settingId: body.settingId != null ? text(body.settingId) : null,
        code: text(body.code),
        message: text(body.message),
      });

      return NextResponse.json({
        success: true,
        message: 'Saved.',
        id,
      });
    }

    if (action === 'remove-audio') {
      const settingId = text(body.settingId);
      const audioFile = await outcomeService.getClubCustomAudioFile(settingId);
      if (audioFile) {
        try {
          await unlink(resolvePublicPath('outcome_messages', 'club', club.id, audioFile));
        } catch {
          /* missing */
        }
      }
      await outcomeService.setClubCustomAudio(settingId, null);
      return NextResponse.json({ success: true, message: 'Audio deleted.' });
    }

    return NextResponse.json({ error: 'Unrecognized action.' }, { status: 400 });
  } catch (error) {
    console.error('PATCH /api/club/settings/outcome-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const decoded = getTokenPayload(request);
    if (!decoded?.userId || !decoded.userType) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!isClubAccountUserType(String(decoded.userType))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const userId = String(decoded.userId);
    const body = await request.json();
    const clubIdParam = resolveRequestedClubId(request, body);
    const club = await getOwnedClub(userId, clubIdParam);
    if (!club) return NextResponse.json({ error: 'Club not found.' }, { status: 404 });

    const prefs = await outcomeService.getClubPreferences(club.id);
    if (prefs.mode !== ClubOutcomeMode.CUSTOM) {
      return NextResponse.json({ error: 'Switch to Custom mode to upload audio.' }, { status: 400 });
    }

    const fileData = text(body.file);
    if (!fileData.startsWith('data:')) {
      return NextResponse.json({ error: 'Invalid upload.' }, { status: 400 });
    }

    let settingId = text(body.settingId);
    if (!settingId) {
      const typeId = text(body.typeId);
      if (typeId) {
        settingId =
          (await outcomeService.resolveClubCustomSettingId(club.id, typeId)) ?? '';
      }
    }
    if (!settingId) {
      return NextResponse.json(
        { error: 'Save the message first, then upload audio.' },
        { status: 400 },
      );
    }

    const customRow = await outcomeService.getClubCustomOutcomeForClub(settingId, club.id);
    if (!customRow) {
      return NextResponse.json({ error: 'Outcome setting not found for this club.' }, { status: 404 });
    }

    const match = fileData.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return NextResponse.json({ error: 'Invalid file format.' }, { status: 400 });

    const mime = match[1];
    const buffer = Buffer.from(match[2], 'base64');
    const ext = audioExtensionFromUpload(mime, text(body.fileName));
    if (!ext) {
      return NextResponse.json({ error: 'Allowed files: .mp3 or .wav' }, { status: 400 });
    }

    if (customRow.audioFile) {
      return NextResponse.json({ error: 'Remove existing audio before uploading a new file.' }, { status: 400 });
    }

    const filename = `${Date.now()}.${ext}`;
    const dir = resolvePublicPath('outcome_messages', 'club', club.id);
    await mkdir(dir, { recursive: true });
    const savedPath = path.join(dir, filename);
    await writeFile(savedPath, buffer);

    if (!(await verifyPublicFile(savedPath))) {
      return NextResponse.json({ error: 'Audio upload could not be verified.' }, { status: 500 });
    }

    await outcomeService.setClubCustomAudio(settingId, filename);

    return NextResponse.json({
      success: true,
      message: 'Audio saved.',
      id: settingId,
      filename,
      audioUrl: clubAudioPublicPath(club.id, filename),
    });
  } catch (error) {
    console.error('POST /api/club/settings/outcome-settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
