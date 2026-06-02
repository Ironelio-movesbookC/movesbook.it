import { NextRequest, NextResponse } from 'next/server';
import { fetchSharedWorkoutDay } from '@/lib/fetchSharedWorkoutDay';

/** Public read-only day plan (no auth). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const dayId = params.id;
    if (!dayId) {
      return NextResponse.json({ error: 'Day ID is required' }, { status: 400 });
    }

    const day = await fetchSharedWorkoutDay(dayId);
    if (!day) {
      return NextResponse.json({ error: 'Day not found' }, { status: 404 });
    }

    return NextResponse.json({ day });
  } catch (error: unknown) {
    console.error('Error fetching shared day:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to fetch day', details: message },
      { status: 500 }
    );
  }
}
