import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import {
  appendMoveframeSnapshotToWorkout,
  pickMoveframeFromPayload,
} from '@/lib/moveframeImport';

export const dynamic = 'force-dynamic';

/** POST — Import a single moveframe into an existing workout (append). */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const {
      targetWorkoutId,
      source,
    } = body as {
      targetWorkoutId?: string;
      source?: {
        type: 'snapshot' | 'global_archive';
        moveframe?: Record<string, unknown>;
        globalEntryId?: string;
        moveframeLetter?: string;
        moveframeIndex?: number;
      };
    };

    if (!targetWorkoutId) {
      return NextResponse.json({ error: 'targetWorkoutId is required' }, { status: 400 });
    }

    if (!source?.type) {
      return NextResponse.json({ error: 'source.type is required' }, { status: 400 });
    }

    if (source.type === 'snapshot') {
      if (!source.moveframe || typeof source.moveframe !== 'object') {
        return NextResponse.json({ error: 'source.moveframe is required' }, { status: 400 });
      }

      const moveframe = await prisma.$transaction((tx) =>
        appendMoveframeSnapshotToWorkout(tx, dbUserId, targetWorkoutId, source.moveframe!)
      );

      return NextResponse.json({ success: true, moveframe }, { status: 201 });
    }

    if (source.type === 'global_archive') {
      if (!source.globalEntryId) {
        return NextResponse.json({ error: 'globalEntryId is required' }, { status: 400 });
      }

      const entry = await prisma.globalWorkoutArchiveEntry.findUnique({
        where: { id: source.globalEntryId },
      });
      if (!entry?.payloadData) {
        return NextResponse.json({ error: 'Archive entry not found' }, { status: 404 });
      }

      let payload: { moveframes?: unknown[] };
      try {
        payload = JSON.parse(entry.payloadData);
      } catch {
        return NextResponse.json({ error: 'Invalid archive payload' }, { status: 400 });
      }

      const moveframes = Array.isArray(payload.moveframes) ? payload.moveframes : [];
      const picked = pickMoveframeFromPayload(moveframes, {
        moveframeLetter: source.moveframeLetter,
        moveframeIndex: source.moveframeIndex,
      });

      if (!picked) {
        return NextResponse.json({ error: 'Moveframe not found in archive entry' }, { status: 404 });
      }

      const moveframe = await prisma.$transaction((tx) =>
        appendMoveframeSnapshotToWorkout(
          tx,
          dbUserId,
          targetWorkoutId,
          picked,
          entry.mainSport
        )
      );

      return NextResponse.json({ success: true, moveframe }, { status: 201 });
    }

    return NextResponse.json({ error: 'Unsupported source type' }, { status: 400 });
  } catch (error) {
    console.error('POST moveframes/import:', error);
    const message = error instanceof Error ? error.message : 'Import failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
