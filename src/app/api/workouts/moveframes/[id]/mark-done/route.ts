import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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

    const body = await request.json().catch(() => ({}));
    const marked = body.marked !== false;

    const moveframe = await prisma.moveframe.findUnique({
      where: { id: params.id },
      include: {
        workoutSession: {
          include: {
            workoutDay: {
              include: { workoutWeek: { include: { workoutPlan: true } } },
            },
          },
        },
      },
    });

    if (
      !moveframe ||
      moveframe.workoutSession.workoutDay.workoutWeek.workoutPlan.userId !== decoded.userId
    ) {
      return NextResponse.json({ error: 'Moveframe not found' }, { status: 404 });
    }

    const updated = await prisma.moveframe.update({
      where: { id: params.id },
      data: { markedDoneAt: marked ? new Date() : null },
    });

    return NextResponse.json({ moveframe: updated });
  } catch (error) {
    console.error('mark moveframe done error:', error);
    return NextResponse.json({ error: 'Failed to update moveframe' }, { status: 500 });
  }
}
