import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET - Fetch all favorite nutritionFoods for the current user
export async function GET(req: NextRequest) {
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
    
    // Fetch all nutritionFoods marked as favorite for this user
    const favoriteNutritionFoods = await prisma.nutritionFood.findMany({
      where: {
        favourite: true,
        nutritionMeal: {
          nutritionDay: {
            userId
          }
        }
      },
      include: {
        nutritionComponents: {
          orderBy: { repetitionNumber: 'asc' }
        },
        nutritionMeal: {
          select: {
            name: true,
            sessionNumber: true,
            nutritionDay: {
              select: {
                date: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    // Transform data for the settings page
    const formattedNutritionFoods = favoriteNutritionFoods.map(mf => {
      let totalDistance = 0;
      let totalDuration = 0;
      
      mf.nutritionComponents.forEach(ml => {
        totalDistance += ml.distance || 0;
        totalDuration += Number(ml.time) || 0;
      });
      
      return {
        id: mf.id,
        name: mf.description || `NutritionFood ${mf.letter}`,
        description: mf.notes || '',
        sport: mf.sport,
        type: mf.type,
        letter: mf.letter,
        lapsCount: mf.nutritionComponents.length,
        totalDistance,
        totalDuration,
        workoutName: mf.nutritionMeal.name,
        workoutNumber: mf.nutritionMeal.sessionNumber,
        lastUsed: mf.nutritionMeal.nutritionDay?.date || mf.createdAt,
        createdAt: mf.createdAt,
        nutritionFoodData: {
          letter: mf.letter,
          sport: mf.sport,
          type: mf.type,
          description: mf.description,
          notes: mf.notes,
          macroFinal: mf.macroFinal,
          alarm: mf.alarm,
          workType: mf.workType,
          nutritionComponents: mf.nutritionComponents.map(ml => ({
            repetitionNumber: ml.repetitionNumber,
            distance: ml.distance,
            speed: ml.speed,
            style: ml.style,
            pace: ml.pace,
            time: ml.time,
            reps: ml.reps,
            r1: ml.r1,
            r2: ml.r2,
            muscularSector: ml.muscularSector,
            exercise: ml.exercise,
            restType: ml.restType,
            pause: ml.pause,
            notes: ml.notes
          }))
        }
      };
    });
    
    return NextResponse.json({ nutritionFoods: formattedNutritionFoods }, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching favorite nutritionFoods:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorite nutrition_foods', details: error.message },
      { status: 500 }
    );
  }
}

