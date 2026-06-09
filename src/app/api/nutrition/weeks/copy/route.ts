import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { verifyToken } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * POST /api/nutrition/weeks/copy
 * Copy a week from one plan (template) to another plan (yearly plan)
 */
export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { sourceSection, sourceWeekNumber, targetSection, targetWeekNumber, sourceWeekId, targetWeekId } = body;

    console.log('📋 Copy week request:', {
      sourceSection,
      sourceWeekNumber,
      targetSection,
      targetWeekNumber,
      sourceWeekId,
      targetWeekId,
      userId: decoded.userId
    });

    // Support both ID-based and section/number-based approaches
    const useIdBased = sourceWeekId && targetWeekId;

    // Validate inputs
    if (!useIdBased && (!sourceSection || !sourceWeekNumber || !targetSection || !targetWeekNumber)) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters (need either week IDs or section/week numbers)' },
        { status: 400 }
      );
    }

    // Get source plan type and storage zone
    let sourceWeek: any;
    let targetWeek: any;

    if (useIdBased) {
      // ID-based approach: directly fetch weeks by ID
      console.log('📋 Using ID-based week copy');
      
      sourceWeek = await prisma.nutritionWeek.findFirst({
        where: {
          id: sourceWeekId,
          nutritionPlan: { userId: decoded.userId }
        },
        include: {
          days: {
            include: {
              meals: {
                include: {
                  nutritionFoods: {
                    include: {
                      nutritionComponents: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!sourceWeek) {
        return NextResponse.json(
          { success: false, error: `Source week not found` },
          { status: 404 }
        );
      }

      targetWeek = await prisma.nutritionWeek.findFirst({
        where: {
          id: targetWeekId,
          nutritionPlan: { userId: decoded.userId }
        },
        include: {
          days: {
            include: {
              meals: {
                include: {
                  nutritionFoods: {
                    include: {
                      nutritionComponents: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!targetWeek) {
        return NextResponse.json(
          { success: false, error: `Target week not found` },
          { status: 404 }
        );
      }

      console.log(`📋 Copying from week ${sourceWeek.weekNumber} (${sourceWeek.days.length} days) to week ${targetWeek.weekNumber}`);
    } else {
      // Section/number-based approach (legacy)
      console.log('📋 Using section/number-based week copy');
      
      const getSourcePlanConfig = (section: string) => {
        if (section === 'A' || section === 'B' || section === 'C') {
          return { type: 'TEMPLATE_WEEKS' as const, storageZone: section };
        } else if (section === 'B') {
          return { type: 'YEARLY_PLAN' as const, storageZone: null };
        }
        return { type: 'MEALS_DONE' as const, storageZone: null };
      };

      const getTargetPlanConfig = (section: string) => {
        if (section === 'B') {
          return { type: 'YEARLY_PLAN' as const, storageZone: null };
        } else if (section === 'C') {
          return { type: 'MEALS_DONE' as const, storageZone: null };
        }
        return { type: 'TEMPLATE_WEEKS' as const, storageZone: section };
      };

      const sourceConfig = getSourcePlanConfig(sourceSection);
      const targetConfig = getTargetPlanConfig(targetSection);

      // Find source plan
      const sourcePlan = await prisma.nutritionPlan.findFirst({
        where: {
          userId: decoded.userId,
          type: sourceConfig.type,
          ...(sourceConfig.storageZone ? { storageZone: sourceConfig.storageZone } : {})
        },
        include: {
          weeks: {
            where: {
              weekNumber: sourceWeekNumber
            },
            include: {
              days: {
                include: {
                  meals: {
                    include: {
                      nutritionFoods: {
                        include: {
                          nutritionComponents: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!sourcePlan || sourcePlan.weeks.length === 0) {
        return NextResponse.json(
          { success: false, error: `Source week ${sourceWeekNumber} not found in ${sourceSection}` },
          { status: 404 }
        );
      }

      // Find target plan
      const targetPlan = await prisma.nutritionPlan.findFirst({
        where: {
          userId: decoded.userId,
          type: targetConfig.type,
          ...(targetConfig.storageZone ? { storageZone: targetConfig.storageZone } : {})
        },
        include: {
          weeks: {
            where: {
              weekNumber: targetWeekNumber
            },
            include: {
              days: {
                include: {
                  meals: {
                    include: {
                      nutritionFoods: {
                        include: {
                          nutritionComponents: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });

      if (!targetPlan) {
        return NextResponse.json(
          { success: false, error: `Target plan (${targetSection}) not found` },
          { status: 404 }
        );
      }

      sourceWeek = sourcePlan.weeks[0];
      targetWeek = targetPlan.weeks[0];

      if (!targetWeek) {
        return NextResponse.json(
          { success: false, error: `Target week ${targetWeekNumber} not found` },
          { status: 404 }
        );
      }

      console.log(`📋 Copying from week ${sourceWeekNumber} (${sourceWeek.days.length} days) to week ${targetWeekNumber}`);
    }

    // Use transaction to copy all data
    await prisma.$transaction(async (tx) => {
      // Delete existing workouts in target week
      for (const day of targetWeek.days) {
        for (const workout of day.meals) {
          // Delete nutrition_components
          for (const nutritionFood of workout.nutritionFoods) {
            await tx.nutritionComponent.deleteMany({
              where: { nutritionFoodId: nutritionFood.id }
            });
          }
          // Delete nutrition_foods
          await tx.nutritionFood.deleteMany({
            where: { nutritionMealId: workout.id }
          });
        }
        // Delete workouts
        await tx.nutritionMeal.deleteMany({
          where: { nutritionDayId: day.id }
        });
      }

      // Copy workouts from source to target
      for (const sourceDay of sourceWeek.days) {
        // Find corresponding target day (by day of week)
        const targetDay = targetWeek.days.find((d: any) => d.dayOfWeek === sourceDay.dayOfWeek);
        if (!targetDay) {
          console.warn(`⚠️ Target day not found for ${sourceDay.dayOfWeek}`);
          continue;
        }

        // Copy each workout
        for (const sourceWorkout of sourceDay.meals) {
          const newWorkout = await tx.nutritionMeal.create({
            data: {
              nutritionDayId: targetDay.id,
              sessionNumber: sourceWorkout.sessionNumber,
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
              notes: sourceWorkout.notes,
              status: sourceWorkout.status,
              includeStretching: sourceWorkout.includeStretching,
              mainSport: sourceWorkout.mainSport
            }
          });

          // Copy nutrition_foods
          for (const sourceNutritionFood of sourceWorkout.nutritionFoods) {
            const newNutritionFood = await tx.nutritionFood.create({
              data: {
                nutritionMealId: newWorkout.id,
                sectionId: sourceNutritionFood.sectionId,
                letter: sourceNutritionFood.letter,
                sport: sourceNutritionFood.sport,
                type: sourceNutritionFood.type,
                description: sourceNutritionFood.description,
                notes: sourceNutritionFood.notes,
                macroFinal: sourceNutritionFood.macroFinal,
                alarm: sourceNutritionFood.alarm,
                annotationText: sourceNutritionFood.annotationText,
                annotationBgColor: sourceNutritionFood.annotationBgColor,
                annotationTextColor: sourceNutritionFood.annotationTextColor,
                annotationBold: sourceNutritionFood.annotationBold,
                workType: sourceNutritionFood.workType,
                manualMode: sourceNutritionFood.manualMode,
                favourite: sourceNutritionFood.favourite
              }
            });

            // Copy nutrition_components
            for (const sourceNutritionComponent of sourceNutritionFood.nutritionComponents) {
              await tx.nutritionComponent.create({
                data: {
                  nutritionFoodId: newNutritionFood.id,
                  repetitionNumber: sourceNutritionComponent.repetitionNumber,
                  distance: sourceNutritionComponent.distance,
                  time: sourceNutritionComponent.time,
                  speed: sourceNutritionComponent.speed,
                  style: sourceNutritionComponent.style,
                  pace: sourceNutritionComponent.pace,
                  pause: sourceNutritionComponent.pause,
                  restType: sourceNutritionComponent.restType,
                  alarm: sourceNutritionComponent.alarm,
                  sound: sourceNutritionComponent.sound,
                  macroFinal: sourceNutritionComponent.macroFinal,
                  reps: sourceNutritionComponent.reps,
                  rowPerMin: sourceNutritionComponent.rowPerMin,
                  r1: sourceNutritionComponent.r1,
                  r2: sourceNutritionComponent.r2,
                  exercise: sourceNutritionComponent.exercise,
                  muscularSector: sourceNutritionComponent.muscularSector,
                  weight: sourceNutritionComponent.weight,
                  tools: sourceNutritionComponent.tools,
                  status: sourceNutritionComponent.status,
                  isSkipped: sourceNutritionComponent.isSkipped,
                  isDisabled: sourceNutritionComponent.isDisabled,
                  notes: sourceNutritionComponent.notes
                }
              });
            }
          }
        }
      }

      // Update target week metadata
      await tx.nutritionWeek.update({
        where: { id: targetWeek.id },
        data: {
          periodId: sourceWeek.periodId,
          notes: sourceWeek.notes
        }
      });
    });

    console.log(`✅ Week ${sourceWeekNumber} copied to week ${targetWeekNumber} successfully`);

    return NextResponse.json({
      success: true,
      message: `Week ${sourceWeekNumber} copied to week ${targetWeekNumber}`
    });

  } catch (error: any) {
    console.error('❌ Error copying week:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
