import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// GET - List all favorite workouts for the user
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
    
    const favorites = await prisma.favoriteNutritionMeal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    // Log workout data for debugging
    console.log('📊 Loaded', favorites.length, 'favorites for user');
    console.log('');
    favorites.forEach((fav, idx) => {
      try {
        const parsed = JSON.parse(fav.mealData);
        console.log(`  ✅ Favorite ${idx + 1} "${fav.name}" (ID: ${fav.id.substring(0, 12)}...):`);
        console.log(`     mainGoal: ${parsed?.workout?.mainGoal || 'null'}`);
        console.log(`     intensity: ${parsed?.workout?.intensity || 'null'}`);
        console.log(`     tags: ${parsed?.workout?.tags || 'null'}`);
        console.log(`     mainSport: ${parsed?.workout?.mainSport || 'null'}`);
        console.log(`     nutritionFoods: ${parsed?.nutritionFoods?.length || 0}`);
        console.log('');
      } catch (e) {
        console.log(`  ❌ Favorite ${idx + 1} "${fav.name}": Error parsing - ${e}`);
        console.log('');
      }
    });
    
    return NextResponse.json(favorites, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching favorite meals:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch favorites' }, { status: 500 });
  }
}

// POST - Save a workout as favorite
export async function POST(req: NextRequest) {
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
    const { nutritionMealId } = await req.json();
    
    if (!nutritionMealId) {
      return NextResponse.json({ error: 'Meal ID is required' }, { status: 400 });
    }
    
    // Check if this meal is already in favorites
    const existingFavorite = await prisma.favoriteNutritionMeal.findFirst({
      where: {
        userId,
        mealData: {
          contains: `"nutritionMealId":"${nutritionMealId}"`
        }
      }
    });
    
    if (existingFavorite) {
      return NextResponse.json({ 
        error: 'This workout is already in your favorites',
        alreadyExists: true 
      }, { status: 409 });
    }
    
    // Fetch the complete workout with all its data
    const workout = await prisma.nutritionMeal.findUnique({
      where: { id: nutritionMealId },
      include: {
        sports: true,
        nutritionFoods: {
          include: {
            nutritionComponents: {
              orderBy: { repetitionNumber: 'asc' }
            },
            section: true
          },
          orderBy: { letter: 'asc' }
        }
      }
    });
    
    if (!workout) {
      return NextResponse.json({ error: 'Workout not found' }, { status: 404 });
    }
    
    // Calculate totals
    let totalDistance = 0;
    let totalDuration = 0;
    const sportsSet = new Set<string>();
    
    workout.nutritionFoods.forEach(mf => {
      sportsSet.add(mf.sport);
      mf.nutritionComponents.forEach(ml => {
        // Handle distance: could be number, string, or null
        if (ml.distance !== null) {
          totalDistance += typeof ml.distance === 'string' 
            ? parseInt(ml.distance) || 0 
            : ml.distance;
        }
        // Handle time: could be number, string, or null
        if (ml.time !== null) {
          totalDuration += typeof ml.time === 'string' 
            ? parseFloat(ml.time) || 0 
            : ml.time;
        }
      });
    });
    
    // Prepare workout data JSON
    const mealDataObj = {
      nutritionMealId: workout.id, // Store the original workout ID for duplicate checking
      workout: {
        name: workout.name,
        code: workout.code,
        sessionNumber: workout.sessionNumber,
        time: workout.time,
        weather: workout.weather,
        location: workout.location,
        surface: workout.surface,
        notes: workout.notes,
        status: workout.status,
        mainSport: workout.mainSport,
        mainGoal: workout.mainGoal,
        intensity: workout.intensity,
        tags: workout.tags
      },
      sports: workout.sports.map(s => ({ sport: s.sport })),
      nutritionFoods: workout.nutritionFoods.map(mf => ({
        letter: mf.letter,
        sport: mf.sport,
        type: mf.type,
        description: mf.description,
        notes: mf.notes,
        macroFinal: mf.macroFinal,
        alarm: mf.alarm,
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
          macroFinal: ml.macroFinal,
          alarm: ml.alarm,
          sound: ml.sound,
          notes: ml.notes,
          status: ml.status,
          isSkipped: ml.isSkipped,
          isDisabled: ml.isDisabled
        }))
      }))
    };
    
    // Test that the JSON can be properly stringified and parsed
    let mealDataStr: string;
    try {
      mealDataStr = JSON.stringify(mealDataObj);
      // Test that it can be parsed back
      JSON.parse(mealDataStr);
    } catch (jsonError) {
      console.error('❌ Failed to create valid JSON for workout data:', jsonError);
      console.error('   NutritionMeal ID:', workout.id);
      console.error('   NutritionMeal Name:', workout.name);
      return NextResponse.json({ 
        error: 'Workout data contains invalid characters that cannot be saved. Please check your notes and descriptions for special characters.' 
      }, { status: 400 });
    }
    
    // Create favorite workout
    const favorite = await prisma.favoriteNutritionMeal.create({
      data: {
        userId,
        name: workout.name,
        description: workout.notes || `Saved from ${new Date().toLocaleDateString()}`,
        mealData: mealDataStr,
        sports: Array.from(sportsSet).join(','),
        totalDistance,
        totalDuration: Math.round(totalDuration)
      }
    });
    
    console.log('✅ Successfully saved favorite meal:', favorite.id, '- JSON length:', mealDataStr.length);
    
    return NextResponse.json({ 
      message: 'Workout saved to favorites successfully',
      favorite 
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error saving favorite workout:', error);
    return NextResponse.json({ error: error.message || 'Failed to save favorite' }, { status: 500 });
  }
}

