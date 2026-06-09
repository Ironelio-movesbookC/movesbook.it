import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { nutrition_components } = await request.json();

    console.log('📝 Reordering nutritionComponents:', nutrition_components.length, 'items');

    if (!nutrition_components || !Array.isArray(nutrition_components)) {
      return NextResponse.json({ error: 'Invalid nutrition_components data' }, { status: 400 });
    }

    // Interactive tx: batch $transaction([...]) requires PrismaPromises; our prisma proxy wraps
    // model calls as plain Promises, so we run sequential updates on the real tx client.
    await prisma.$transaction(async (tx) => {
      for (const ml of nutrition_components as {
        id: string;
        repetitionNumber: number;
        isNewlyAdded?: boolean;
      }[]) {
        console.log(`  - Updating nutritionComponent ${ml.id}: repetitionNumber=${ml.repetitionNumber}, isNewlyAdded=${ml.isNewlyAdded}`);
        const data: { repetitionNumber: number; isNewlyAdded?: boolean } = {
          repetitionNumber: ml.repetitionNumber,
        };
        if (typeof ml.isNewlyAdded === 'boolean') {
          data.isNewlyAdded = ml.isNewlyAdded;
        }
        await tx.nutritionComponent.update({
          where: { id: ml.id },
          data,
        });
      }
    });

    console.log('✅ NutritionComponents reordered successfully');

    return NextResponse.json({ 
      success: true, 
      message: 'NutritionComponents reordered successfully',
      count: nutrition_components.length 
    });

  } catch (error: any) {
    console.error('❌ Error reordering nutritionComponents:', error);
    console.error('Error details:', error.message, error.stack);
    return NextResponse.json(
      { error: 'Failed to reorder nutrition_components', details: error.message },
      { status: 500 }
    );
  }
}

