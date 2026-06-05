import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// DELETE - Remove a favorite workout
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.userId;
    const favoriteId = params.id;
    
    // Verify ownership before deleting
    const favorite = await prisma.favoriteNutritionMeal.findUnique({
      where: { id: favoriteId }
    });
    
    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }
    
    if (favorite.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Delete the favorite
    await prisma.favoriteNutritionMeal.delete({
      where: { id: favoriteId }
    });
    
    return NextResponse.json({ message: 'Favorite deleted successfully' }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting favorite workout:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete favorite' }, { status: 500 });
  }
}

// PATCH - Update a favorite workout
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    
    const userId = decoded.userId;
    const favoriteId = params.id;
    const { name, mealData, intensity, tags } = await req.json();
    
    // Verify ownership before updating
    const favorite = await prisma.favoriteNutritionMeal.findUnique({
      where: { id: favoriteId }
    });
    
    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }
    
    if (favorite.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    
    // Validate mealData JSON if provided
    let validatedMealData = favorite.mealData;
    if (mealData) {
      try {
        const parsed = JSON.parse(mealData);
        validatedMealData = JSON.stringify(parsed);
        console.log('✅ Validated mealData JSON for favorite update:', favoriteId, '- Length:', validatedMealData.length);
      } catch (jsonError) {
        console.error('❌ Invalid JSON in mealData update:', jsonError);
        console.error('   Favorite ID:', favoriteId);
        return NextResponse.json({ 
          error: 'Invalid meal data format. Please check for special characters in notes and descriptions.' 
        }, { status: 400 });
      }
    }
    
    // Update the favorite
    const updated = await prisma.favoriteNutritionMeal.update({
      where: { id: favoriteId },
      data: {
        name: name || favorite.name,
        mealData: validatedMealData,
      }
    });
    
    return NextResponse.json({ 
      message: 'Favorite updated successfully',
      favorite: updated
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error updating favorite workout:', error);
    return NextResponse.json({ error: error.message || 'Failed to update favorite' }, { status: 500 });
  }
}

