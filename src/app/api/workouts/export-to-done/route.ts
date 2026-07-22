import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { exportWorkoutsToDone } from '@/lib/exportWorkoutToDone';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { mode, sourceWorkoutId, sourceDayId, targetDayIds, statusByWorkoutId } = body;

    if (mode !== 'workout' && mode !== 'day') {
      return NextResponse.json({ error: 'mode must be workout or day' }, { status: 400 });
    }

    const result = await exportWorkoutsToDone({
      userId: decoded.userId,
      mode,
      sourceWorkoutId,
      sourceDayId,
      targetDayIds: Array.isArray(targetDayIds) ? targetDayIds : undefined,
      statusByWorkoutId,
    });

    return NextResponse.json({
      success: true,
      ...result,
      message: `Exported ${result.exportedCount} workout(s) to Workouts Done`,
    });
  } catch (error) {
    console.error('export-to-done error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to export to Workouts Done' },
      { status: 500 },
    );
  }
}
