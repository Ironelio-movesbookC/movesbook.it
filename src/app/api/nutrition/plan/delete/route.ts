import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// DELETE - Remove a workout plan and all its data
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'CURRENT_WEEKS';

    console.log('DELETE - Removing plan for type:', type);

    // Find the plan
    const plan = await prisma.nutritionPlan.findFirst({
      where: {
        userId: decoded.userId,
        type: type as any
      }
    });

    if (!plan) {
      return NextResponse.json({ message: 'No plan found to delete' }, { status: 404 });
    }

    // Delete the plan (cascade will handle weeks, days, workouts, etc.)
    await prisma.nutritionPlan.delete({
      where: { id: plan.id }
    });

    console.log('✅ Plan deleted:', plan.id);

    return NextResponse.json({ 
      message: 'Plan deleted successfully',
      deletedPlanId: plan.id
    });
  } catch (error) {
    console.error('Error deleting workout plan:', error);
    return NextResponse.json(
      { error: 'Failed to delete workout plan' },
      { status: 500 }
    );
  }
}

