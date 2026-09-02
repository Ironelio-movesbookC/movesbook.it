import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveMessageDatabaseUserId } from '@/lib/messages/resolveMessageUserId';
import {
  MOVESBOOK_USER_NAME_VISIBILITY_KEY,
  DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY,
  movesbookUserNameVisibilityFromSocialSettings,
  isMovesbookUserNameVisibility,
  type MovesbookUserNameVisibility,
} from '@/lib/chat/movesbookUserNameVisibility';

export const dynamic = 'force-dynamic';

async function resolveAuthedUserId(
  request: NextRequest
): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const decoded = verifyToken(authHeader.replace('Bearer ', ''));
  if (!decoded?.userId) return null;
  return resolveMessageDatabaseUserId(decoded.userId, decoded.userType);
}

function parseSocialSettingsObject(
  raw: string | null | undefined
): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

/** GET — current user's movesbook-user name visibility preference. */
export async function GET(request: NextRequest) {
  try {
    const myId = await resolveAuthedUserId(request);
    if (!myId) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const settings = await prisma.userSettings.findUnique({
      where: { userId: myId },
      select: { socialSettings: true },
    });

    const visibility = movesbookUserNameVisibilityFromSocialSettings(
      settings?.socialSettings
    );

    return NextResponse.json({
      visibility,
      default: DEFAULT_MOVESBOOK_USER_NAME_VISIBILITY,
    });
  } catch (error) {
    console.error('Movesbook-user name visibility GET:', error);
    return NextResponse.json(
      { error: 'Failed to load setting' },
      { status: 500 }
    );
  }
}

/** PUT — update movesbook-user name visibility (stored in socialSettings). */
export async function PUT(request: NextRequest) {
  try {
    const myId = await resolveAuthedUserId(request);
    if (!myId) {
      return NextResponse.json(
        { error: 'Authorization required' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    const raw = body?.visibility;
    if (!isMovesbookUserNameVisibility(raw)) {
      return NextResponse.json(
        {
          error: 'Invalid visibility. Use hidden or visible.',
        },
        { status: 400 }
      );
    }

    const visibility: MovesbookUserNameVisibility = raw;

    const existing = await prisma.userSettings.findUnique({
      where: { userId: myId },
      select: { socialSettings: true },
    });

    const social = parseSocialSettingsObject(existing?.socialSettings);
    social[MOVESBOOK_USER_NAME_VISIBILITY_KEY] = visibility;
    const payload = JSON.stringify(social);

    await prisma.userSettings.upsert({
      where: { userId: myId },
      update: { socialSettings: payload },
      create: {
        userId: myId,
        colorSettings: '{}',
        toolsSettings: '{}',
        favouritesSettings: '{}',
        myBestSettings: '{}',
        adminSettings: '{}',
        workoutPreferences: '{}',
        socialSettings: payload,
        notificationSettings: '{}',
        widgetArrangement: '[]',
      },
    });

    return NextResponse.json({ visibility });
  } catch (error) {
    console.error('Movesbook-user name visibility PUT:', error);
    return NextResponse.json(
      { error: 'Failed to save setting' },
      { status: 500 }
    );
  }
}

