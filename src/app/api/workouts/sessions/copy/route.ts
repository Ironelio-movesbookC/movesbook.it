import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// POST /api/workouts/sessions/copy - Copy a workout session to another day
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
    const { sourceWorkoutId, targetDayId, sessionNumber, replaceWorkoutId } = body;

    console.log('📋 Copying workout:', { sourceWorkoutId, targetDayId, sessionNumber });

    // Validate required fields
    if (!sourceWorkoutId || !targetDayId) {
      return NextResponse.json(
        { error: 'sourceWorkoutId and targetDayId are required' },
        { status: 400 }
      );
    }

    // Get the source workout with all its data
    const sourceWorkout = await prisma.workoutSession.findUnique({
      where: { id: sourceWorkoutId },
      include: {
        sports: true,
        moveframes: {
          include: {
            movelaps: true,
            section: true
          }
        }
      }
    });

    if (!sourceWorkout) {
      return NextResponse.json({ error: 'Source workout not found' }, { status: 404 });
    }

    // Check existing workouts for the target day
    const existingWorkouts = await prisma.workoutSession.findMany({
      where: { workoutDayId: targetDayId },
      select: { id: true, sessionNumber: true }
    });

    let newSessionNumber = sessionNumber;

    if (replaceWorkoutId) {
      const toReplace = existingWorkouts.find((w) => w.id === replaceWorkoutId);
      if (!toReplace) {
        return NextResponse.json(
          { error: 'Workout to replace was not found on the target day' },
          { status: 404 }
        );
      }

      newSessionNumber = toReplace.sessionNumber;

      for (const mf of await prisma.moveframe.findMany({
        where: { workoutSessionId: replaceWorkoutId },
        select: { id: true },
      })) {
        await prisma.movelap.deleteMany({ where: { moveframeId: mf.id } });
      }
      await prisma.moveframe.deleteMany({ where: { workoutSessionId: replaceWorkoutId } });
      await prisma.workoutSession.delete({ where: { id: replaceWorkoutId } });
    } else {
      // Validate: max 3 workouts per day
      if (existingWorkouts.length >= 3) {
        return NextResponse.json(
          { error: 'Cannot copy workout: Maximum 3 workouts per day allowed. Select a workout to overwrite.' },
          { status: 400 }
        );
      }

      if (!newSessionNumber) {
        newSessionNumber = Math.max(0, ...existingWorkouts.map(w => w.sessionNumber)) + 1;
      }
    }

    // Create new workout with copied data
    // Only include fields that exist in the WorkoutSession model
    const newWorkout = await prisma.workoutSession.create({
      data: {
        workoutDayId: targetDayId,
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
        notes: sourceWorkout.notes || null,
        status: 'NOT_PLANNED',
        mainSport: sourceWorkout.mainSport,
        mainGoal: sourceWorkout.mainGoal,
        intensity: sourceWorkout.intensity,
        tags: sourceWorkout.tags,
        // Copy sports
        sports: {
          create: sourceWorkout.sports.map((sport: any) => ({
            sport: sport.sport
          }))
        },
        // Copy moveframes
        moveframes: {
          create: sourceWorkout.moveframes.map((mf: any) => ({
            letter: mf.letter,
            sport: mf.sport,
            type: mf.type,
            description: mf.description,
            sectionId: mf.sectionId,
            // Copy movelaps
            movelaps: {
              create: mf.movelaps.map((lap: any) => ({
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
        moveframes: {
          include: {
            movelaps: true,
            section: true
          }
        }
      }
    });

    console.log('✅ Workout copied successfully:', newWorkout.id);

    return NextResponse.json({ workout: newWorkout }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error copying workout:', error);
    return NextResponse.json(
      { error: 'Failed to copy workout', details: error.message },
      { status: 500 }
    );
  }
}

