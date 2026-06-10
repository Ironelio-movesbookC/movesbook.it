import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';


// POST /api/nutrition/days/copy - Copy a day to a new date
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
    const { sourceDayId, targetDate, targetWeekId } = body;

    console.log('📋 Copying day:', { sourceDayId, targetDate, targetWeekId });

    // Validate required fields
    if (!sourceDayId || !targetDate || !targetWeekId) {
      return NextResponse.json(
        { error: 'sourceDayId, targetDate, and targetWeekId are required' },
        { status: 400 }
      );
    }

    // Get the source day with all its data
    const sourceDay = await prisma.nutritionDay.findUnique({
      where: { id: sourceDayId },
      include: {
        meals: {
          include: {
            sports: true,
            nutritionFoods: {
              include: {
                nutritionComponents: true,
                section: true
              }
            }
          }
        },
        period: true
      }
    });

    if (!sourceDay) {
      return NextResponse.json({ error: 'Source day not found' }, { status: 404 });
    }

    // Check if target date already has a day
    const existingDay = await prisma.nutritionDay.findFirst({
      where: {
        userId: decoded.userId,
        date: new Date(targetDate)
      }
    });

    if (existingDay) {
      return NextResponse.json(
        { error: 'A workout day already exists on this date' },
        { status: 409 }
      );
    }

    // Determine storageZone from the target week's plan
    const targetWeek = await prisma.nutritionWeek.findUnique({
      where: { id: targetWeekId },
      include: { nutritionPlan: { select: { type: true } } }
    });

    let storageZone: 'A' | 'B' | 'C' | 'D' = sourceDay.storageZone || 'B';
    if (targetWeek?.nutritionPlan) {
      if (targetWeek.nutritionPlan.type === 'TEMPLATE_WEEKS') storageZone = 'A';
      else if (targetWeek.nutritionPlan.type === 'YEARLY_PLAN') storageZone = 'B';
      else if (targetWeek.nutritionPlan.type === 'MEALS_DONE') storageZone = 'C';
      else if (targetWeek.nutritionPlan.type === 'ARCHIVE') storageZone = 'D';
    }

    // Create new day with copied data
    const newDay = await prisma.nutritionDay.create({
      data: {
        userId: decoded.userId,
        nutritionWeekId: targetWeekId,
        date: new Date(targetDate),
        weekNumber: sourceDay.weekNumber,
        dayOfWeek: sourceDay.dayOfWeek,
        periodId: sourceDay.periodId,
        storageZone,
        weather: sourceDay.weather,
        feelingStatus: sourceDay.feelingStatus,
        notes: `${sourceDay.notes || ''} (Copied from ${new Date(sourceDay.date).toLocaleDateString()})`,
        // Copy workouts
        meals: {
          create: sourceDay.meals.map((workout: any) => ({
            sessionNumber: workout.sessionNumber,
            name: workout.name,
            code: workout.code,
            time: workout.time,
            location: workout.location,
            notes: workout.notes,
            status: 'NOT_PLANNED', // Reset status for copied workout
            symbol: workout.symbol,
            includeStretching: workout.includeStretching,
            // Copy sports
            sports: {
              create: workout.sports.map((sport: any) => ({
                sport: sport.sport
              }))
            },
            // Copy nutrition_foods
            nutritionFoods: {
              create: workout.nutritionFoods.map((mf: any) => ({
                letter: mf.letter,
                code: mf.code,
                type: mf.type,
                description: mf.description,
                sport: mf.sport,
                distance: mf.distance,
                distanceUnit: mf.distanceUnit,
                speed: mf.speed,
                pace: mf.pace,
                pause: mf.pause,
                repetitions: mf.repetitions,
                style: mf.style,
                notes: mf.notes,
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
                    pause: lap.pause,
                    alarm: lap.alarm,
                    sound: lap.sound,
                    notes: lap.notes,
                    reps: lap.reps,
                    weight: lap.weight,
                    status: 'PENDING', // Reset status
                    isSkipped: false,
                    isDisabled: false
                  }))
                }
              }))
            }
          }))
        }
      },
      include: {
        meals: {
          include: {
            sports: true,
            nutritionFoods: {
              include: {
                nutritionComponents: true,
                section: true
              }
            }
          }
        },
        period: true
      }
    });

    console.log('✅ Day copied successfully:', newDay.id);

    return NextResponse.json({ day: newDay }, { status: 201 });
  } catch (error: any) {
    console.error('❌ Error copying day:', error);
    return NextResponse.json(
      { error: 'Failed to copy day', details: error.message },
      { status: 500 }
    );
  }
}

