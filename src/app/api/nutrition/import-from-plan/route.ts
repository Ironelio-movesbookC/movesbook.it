import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

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
    const { workoutIds, targetDate } = body;

    if (!workoutIds || !Array.isArray(workoutIds) || workoutIds.length === 0) {
      return NextResponse.json({ error: 'Workout IDs are required' }, { status: 400 });
    }

    console.log('POST /api/nutrition/import-from-plan - Importing', workoutIds.length, 'meals');

    // Get the Workouts Done plan
    const donePlan = await prisma.nutritionPlan.findFirst({
      where: {
        userId: decoded.userId,
        type: 'MEALS_DONE'
      },
      include: {
        weeks: {
          orderBy: { weekNumber: 'asc' }
        }
      }
    });

    if (!donePlan) {
      return NextResponse.json({ error: 'Workouts Done plan not found. Please create a yearly plan first.' }, { status: 404 });
    }

    const importedWorkouts = [];

    for (const nutritionMealId of workoutIds) {
      // Get the source workout with all its data
      const sourceWorkout = await prisma.nutritionMeal.findUnique({
        where: { id: nutritionMealId },
        include: {
          nutritionDay: true,
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

      if (!sourceWorkout) {
        console.log(`⚠️ NutritionMeal ${nutritionMealId} not found, skipping...`);
        continue;
      }

      console.log(`📋 Importing workout: ${sourceWorkout.name} from ${sourceWorkout.nutritionDay.date}`);

      // Determine target date (use provided date or original date)
      const workoutDate = targetDate ? new Date(targetDate) : new Date(sourceWorkout.nutritionDay.date);

      // Calculate week number and day of week
      const dayOfWeek = workoutDate.getDay() === 0 ? 7 : workoutDate.getDay();
      const planStartDate = new Date(donePlan.startDate);
      const diffDays = Math.floor((workoutDate.getTime() - planStartDate.getTime()) / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(diffDays / 7) + 1;

      // Find or create the corresponding week in Done plan
      let targetWeek = donePlan.weeks.find(w => w.weekNumber === weekNumber);
      if (!targetWeek) {
        console.log(`Creating week ${weekNumber} in Done plan...`);
        targetWeek = await prisma.nutritionWeek.create({
          data: {
            nutritionPlanId: donePlan.id,
            weekNumber: weekNumber
          }
        });
      }

      // Find or create the day in Done plan
      let targetDay = await prisma.nutritionDay.findUnique({
        where: {
          userId_date_storageZone: {
            userId: decoded.userId,
            date: workoutDate,
            storageZone: 'C'
          }
        }
      });

      if (!targetDay) {
        console.log(`Creating day ${workoutDate.toLocaleDateString()} in Done plan...`);
        
        // Get period from source day
        const period = await prisma.period.findFirst({
          where: { userId: decoded.userId }
        });

        // Determine storageZone - import-from-plan creates days in MEALS_DONE (Section C)
        const storageZone: 'A' | 'B' | 'C' | 'D' = 'C';

        targetDay = await prisma.nutritionDay.create({
          data: {
            nutritionWeekId: targetWeek.id,
            userId: decoded.userId,
            dayOfWeek,
            weekNumber,
            date: workoutDate,
            periodId: period?.id || sourceWorkout.nutritionDay.periodId,
            storageZone,
            weather: sourceWorkout.nutritionDay.weather,
            feelingStatus: sourceWorkout.nutritionDay.feelingStatus,
            notes: sourceWorkout.nutritionDay.notes
          }
        });
      }

      // Create the workout in Done plan
      const newWorkout = await prisma.nutritionMeal.create({
        data: {
          nutritionDayId: targetDay.id,
          name: sourceWorkout.name,
          code: sourceWorkout.code,
          sessionNumber: sourceWorkout.sessionNumber,
          mainSport: sourceWorkout.mainSport,
          time: sourceWorkout.time || '',
          weather: sourceWorkout.weather,
          location: sourceWorkout.location,
          surface: sourceWorkout.surface,
          heartRateMax: sourceWorkout.heartRateMax,
          heartRateAvg: sourceWorkout.heartRateAvg,
          calories: sourceWorkout.calories,
          feelingStatus: sourceWorkout.feelingStatus,
          notes: sourceWorkout.notes,
          status: sourceWorkout.status || 'PLANNED',
          includeStretching: sourceWorkout.includeStretching ?? true
        }
      });

      console.log(`✓ Created workout ${newWorkout.id}`);

      // Copy all sports
      if (sourceWorkout.sports && sourceWorkout.sports.length > 0) {
        for (const sport of sourceWorkout.sports) {
          await prisma.nutritionMealSport.create({
            data: {
              nutritionMealId: newWorkout.id,
              sport: sport.sport
            }
          });
        }
      }

      // Copy all nutritionFoods with their nutrition_components
      if (sourceWorkout.nutritionFoods && sourceWorkout.nutritionFoods.length > 0) {
        for (const mf of sourceWorkout.nutritionFoods) {
          const newNutritionFood = await prisma.nutritionFood.create({
            data: {
              nutritionMealId: newWorkout.id,
              letter: mf.letter,
              sport: mf.sport,
              description: mf.description,
              type: mf.type,
              sectionId: mf.sectionId,
              notes: mf.notes,
              macroFinal: mf.macroFinal,
              alarm: mf.alarm,
              annotationText: mf.annotationText,
              annotationBgColor: mf.annotationBgColor,
              annotationTextColor: mf.annotationTextColor,
              annotationBold: mf.annotationBold,
              workType: mf.workType
            }
          });

          // Copy all nutrition_components
          if (mf.nutritionComponents && mf.nutritionComponents.length > 0) {
            for (const ml of mf.nutritionComponents) {
              await prisma.nutritionComponent.create({
                data: {
                  nutritionFoodId: newNutritionFood.id,
                  repetitionNumber: ml.repetitionNumber,
                  distance: ml.distance,
                  time: ml.time,
                  pace: ml.pace,
                  speed: ml.speed,
                  style: ml.style,
                  restType: ml.restType,
                  pause: ml.pause,
                  alarm: ml.alarm,
                  sound: ml.sound,
                  reps: ml.reps,
                  weight: ml.weight,
                  tools: ml.tools,
                  rowPerMin: ml.rowPerMin,
                  notes: ml.notes,
                  status: ml.status || 'PLANNED',
                  isSkipped: ml.isSkipped ?? false,
                  isDisabled: ml.isDisabled ?? false,
                  isNewlyAdded: ml.isNewlyAdded ?? false,
                  macroFinal: ml.macroFinal,
                  r1: ml.r1,
                  r2: ml.r2,
                  exercise: ml.exercise,
                  muscularSector: ml.muscularSector
                }
              });
            }
          }
        }
      }

      importedWorkouts.push({
        id: newWorkout.id,
        name: newWorkout.name,
        date: workoutDate
      });
    }

    console.log(`✅ Successfully imported ${importedWorkouts.length} workouts`);

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedWorkouts.length} workout(s) to Workouts Done`,
      importedWorkouts
    });
  } catch (error) {
    console.error('Error importing meals:', error);
    return NextResponse.json(
      { error: 'Failed to import workouts', details: (error as Error).message },
      { status: 500 }
    );
  }
}

