import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// POST /api/nutrition/sessions/copy - Copy a workout session to another day
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { sourceWorkoutId, targetDayId, sessionNumber } = body;

    console.log('📋 Copying workout:', { sourceWorkoutId, targetDayId, sessionNumber });

    // Validate required fields
    if (!sourceWorkoutId || !targetDayId) {
      return NextResponse.json(
        { error: 'sourceWorkoutId and targetDayId are required' },
        { status: 400 }
      );
    }

    // Get the source workout with all its data
    const sourceWorkout = await prisma.nutritionMeal.findUnique({
      where: { id: sourceWorkoutId },
      include: {
        sports: true,
        nutritionFoods: {
          include: {
            nutritionComponents: true,
            section: true
          }
        }
      }
    });

    if (!sourceWorkout) {
      return NextResponse.json({ error: 'Source workout not found' }, { status: 404 });
    }

    // Check existing workouts for the target day
    const existingWorkouts = await prisma.nutritionMeal.findMany({
      where: { nutritionDayId: targetDayId },
      select: { sessionNumber: true }
    });

    // Validate: max 4 meals per day
    if (existingWorkouts.length >= 4) {
      return NextResponse.json(
        { error: 'Cannot copy meal: Maximum 4 meals per day allowed' },
        { status: 400 }
      );
    }

    // Determine session number if not provided
    let newSessionNumber = sessionNumber;
    if (!newSessionNumber) {
      newSessionNumber = Math.max(0, ...existingWorkouts.map(w => w.sessionNumber)) + 1;
    }

    // Create new workout with copied data
    // Only include fields that exist in the NutritionMeal model
    const newWorkout = await prisma.nutritionMeal.create({
      data: {
        nutritionDayId: targetDayId,
        sessionNumber: newSessionNumber,
        name: sourceWorkout.name,
        code: sourceWorkout.code,
        time: sourceWorkout.time,
        weather: sourceWorkout.weather,
        location: sourceWorkout.location,
        surface: sourceWorkout.surface,
        heartRateMax: sourceWorkout.heartRateMax,
        heartRateAvg: sourceWorkout.heartRateAvg,
        calories: sourceWorkout.calories,
        feelingStatus: sourceWorkout.feelingStatus,
        notes: `${sourceWorkout.notes || ''} (Copied)`,
        status: 'NOT_PLANNED', // Reset status for copied workout
        // Copy sports
        sports: {
          create: sourceWorkout.sports.map((sport: any) => ({
            sport: sport.sport
          }))
        },
        // Copy nutrition_foods
        nutritionFoods: {
          create: sourceWorkout.nutritionFoods.map((mf: any) => ({
            letter: mf.letter,
            sport: mf.sport,
            type: mf.type,
            description: mf.description,
            sectionId: mf.sectionId,
            // Copy nutrition_components
            nutritionComponents: {
              create: mf.nutritionComponents.map((lap: any) => ({
                repetitionNumber: lap.repetitionNumber,
                distance: lap.distance,
                speed: lap.speed,
                style: lap.style,
                pace: lap.pace,
                time: lap.time,
                reps: lap.reps,
                restType: lap.restType,
                pause: lap.pause,
                alarm: lap.alarm,
                sound: lap.sound,
                notes: lap.notes,
                status: 'PENDING',
                isSkipped: false,
                isDisabled: false
              }))
            }
          }))
        }
      },
      include: {
        sports: true,
        nutritionFoods: {
          include: {
            nutritionComponents: true,
            section: true
          }
        }
      }
    });

    console.log('✅ NutritionMeal copied successfully:', newWorkout.id);

    return NextResponse.json({ workout: newWorkout }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error copying workout:', error);
    return NextResponse.json(
      { error: 'Failed to copy workout', details: error.message },
      { status: 500 }
    );
  }
}

