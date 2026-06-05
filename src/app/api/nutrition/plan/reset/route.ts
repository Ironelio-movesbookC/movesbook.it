import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


/**
 * DELETE endpoint to reset/delete workout plans
 * This forces recreation with Monday start dates
 */
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
    const type = searchParams.get('type'); // Optional: specify which plan type to delete

    console.log('🗑️ Resetting workout plans for user:', decoded.userId, 'type:', type || 'ALL');

    // Delete workout days first (to avoid foreign key issues)
    if (type) {
      await prisma.nutritionDay.deleteMany({
        where: {
          userId: decoded.userId,
          nutritionWeek: {
            nutritionPlan: {
              type: type as any
            }
          }
        }
      });
    } else {
      await prisma.nutritionDay.deleteMany({
        where: { userId: decoded.userId }
      });
    }

    // Delete workout plans
    const result = await prisma.nutritionPlan.deleteMany({
      where: {
        userId: decoded.userId,
        ...(type ? { type: type as any } : {})
      }
    });

    console.log(`✓ Deleted ${result.count} workout plan(s)`);

    return NextResponse.json({ 
      success: true, 
      message: `Deleted ${result.count} workout plan(s)`,
      plansDeleted: result.count
    });
  } catch (error) {
    console.error('Error resetting workout plans:', error);
    return NextResponse.json(
      { error: 'Failed to reset workout plans', details: (error as Error).message },
      { status: 500 }
    );
  }
}

