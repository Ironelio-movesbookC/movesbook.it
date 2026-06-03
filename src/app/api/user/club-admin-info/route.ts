import { NextRequest, NextResponse } from 'next/server';
import { prismaConnect } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import {
  loadClubAdminInfoForUser,
  saveClubAdminInfoForUser,
} from '@/lib/user/clubAdminInfoPersistence';

export const dynamic = 'force-dynamic';

async function resolveDbUserId(request: NextRequest): Promise<
  { ok: true; userId: string } | { ok: false; response: NextResponse }
> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Authorization required' }, { status: 401 }),
    };
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = verifyToken(token);
  if (!decoded?.userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Invalid token' }, { status: 401 }),
    };
  }

  if (decoded.userId === 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 401 }),
    };
  }

  await prismaConnect();
  const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
  if (!dbUserId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'User not found' }, { status: 404 }),
    };
  }

  return { ok: true, userId: dbUserId };
}

/** GET — Load club admin info from user_settings.socialSettings.clubAdminInfo */
export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveDbUserId(request);
    if (!resolved.ok) return resolved.response;

    const data = await loadClubAdminInfoForUser(resolved.userId);
    return NextResponse.json({ ok: true, ...data });
  } catch (error) {
    console.error('Error loading club admin info:', error);
    return NextResponse.json({ error: 'Failed to load admin info' }, { status: 500 });
  }
}

/** PATCH — Save club admin info to the database */
export async function PATCH(request: NextRequest) {
  try {
    const resolved = await resolveDbUserId(request);
    if (!resolved.ok) return resolved.response;

    const body = (await request.json().catch(() => null)) as {
      clubAdminInfo?: unknown;
      youtubeChannelUrl?: string | null;
    } | null;

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const payload = body.clubAdminInfo ?? body;
    const clubAdminInfo = await saveClubAdminInfoForUser(resolved.userId, payload, {
      youtubeChannelUrl: body.youtubeChannelUrl,
    });

    return NextResponse.json({
      ok: true,
      clubAdminInfo,
      message: 'Admin info saved successfully.',
    });
  } catch (error) {
    console.error('Error saving club admin info:', error);
    return NextResponse.json({ error: 'Failed to save admin info' }, { status: 500 });
  }
}
