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
    const {
      nutritionDayId,
      dayId, // Alternative field name for nutritionDayId
      sessionNumber,
      name,
      code,
      time,
      location,
      notes,
      status,
      sports,
      symbol,
      includeStretching,
      mainSport,
      mainGoal,
      intensity,
      tags,
      nutritionFoods: nutritionFoodsFromBody
    } = body;

    const nutritionFoods = nutritionFoodsFromBody ?? body.nutrition_foods;

    // Use dayId if nutritionDayId is not provided
    const actualDayId = nutritionDayId || dayId;

    console.log('📝 Creating workout session with data:', { 
      actualDayId, 
      sessionNumber, 
      name, 
      code,
      sports,
      symbol,
      includeStretching,
      mainSport,
      mainGoal,
      nutritionFoodsProvided: !!nutritionFoods
    });

    // Validate required fields
    // Note: sessionNumber is optional when copying from favorites
    if (!actualDayId) {
      return NextResponse.json(
        { error: 'Missing required field: dayId or nutritionDayId' },
        { status: 400 }
      );
    }

    // Validate sports array (if provided)
    // NOTE: Sports are now optional - they will be auto-loaded from nutrition_foods
    if (sports && Array.isArray(sports) && sports.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 sports allowed per workout' },
        { status: 400 }
      );
    }
    
    // Ensure sports is always an array (even if empty)
    const sportsList = sports && Array.isArray(sports) ? sports.filter(s => s) : [];

    // Check existing workouts for this day
    const existingWorkouts = await prisma.nutritionMeal.findMany({
      where: { nutritionDayId: actualDayId },
      select: { id: true }
    });

    // Validate: max 4 meals per day
    if (existingWorkouts.length >= 4) {
      return NextResponse.json(
        { error: 'Cannot add meal: Maximum 4 meals per day allowed' },
        { status: 400 }
      );
    }

    // Verify the workout day exists and belongs to user
    const nutritionDay = await prisma.nutritionDay.findUnique({
      where: { id: actualDayId },
      include: {
        nutritionWeek: {
          include: {
            nutritionPlan: true
          }
        }
      }
    });

    if (!nutritionDay) {
      return NextResponse.json(
        { error: 'Workout day not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (nutritionDay.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - this day belongs to another user' },
        { status: 403 }
      );
    }

    // Determine session number automatically if not provided
    let finalSessionNumber = sessionNumber;
    if (!finalSessionNumber) {
      const existingSessions = await prisma.nutritionMeal.findMany({
        where: { nutritionDayId: actualDayId },
        select: { sessionNumber: true },
        orderBy: { sessionNumber: 'desc' }
      });
      finalSessionNumber = existingSessions.length > 0 ? existingSessions[0].sessionNumber + 1 : 1;
    }

    // Check if session number already exists for this day
    const existingSession = await prisma.nutritionMeal.findFirst({
      where: {
        nutritionDayId: actualDayId,
        sessionNumber: finalSessionNumber
      }
    });

    if (existingSession) {
      return NextResponse.json(
        { error: 'Session number already exists for this day' },
        { status: 400 }
      );
    }

    // Check max 4 meals per day
    const sessionsCount = await prisma.nutritionMeal.count({
      where: { nutritionDayId: actualDayId }
    });

    if (sessionsCount >= 4) {
      return NextResponse.json(
        { error: 'Maximum 4 meals per day' },
        { status: 400 }
      );
    }

    // Get or create a default section for nutrition_foods
    let defaultSection = await prisma.nutritionSection.findFirst({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'asc' }
    });

    // If no section exists, create a default one
    if (!defaultSection) {
      defaultSection = await prisma.nutritionSection.create({
        data: {
          userId: decoded.userId,
          name: 'Default',
          code: 'DEF',
          description: 'Default section',
          color: '#3B82F6'
        }
      });
    }

    // Create workout session with sports (if any) and nutritionFoods (if provided)
    const session = await prisma.nutritionMeal.create({
      data: {
        nutritionDayId: actualDayId,
        sessionNumber: finalSessionNumber,
        name: name || `Workout ${finalSessionNumber}`,
        code: code || '',
        time: time || '',
        location: location || '',
        notes: notes || (includeStretching ? `${symbol || ''} Includes stretching` : symbol || ''),
        status: status as any || 'PLANNED_FUTURE',
        mainSport: mainSport || null,
        mainGoal: mainGoal || null,
        intensity: intensity || 'Medium',
        tags: tags || null,
        ...(sportsList.length > 0 && {
          sports: {
            create: sportsList.map((sport: string) => ({
              sport: sport as any
            }))
          }
        }),
        ...(nutritionFoods && Array.isArray(nutritionFoods) && nutritionFoods.length > 0 && {
          nutritionFoods: {
            create: nutritionFoods.map((mf: any) => ({
              letter: mf.letter,
              sport: mf.sport as any,
              type: mf.type || 'STANDARD', // Default to STANDARD if not provided
              quantity: mf.quantity,
              quantityType: mf.quantityType as any,
              repetitions: mf.repetitions,
              rest: mf.rest,
              intensity: mf.intensity,
              speedType: mf.speedType as any,
              description: mf.description || null,
              notes: mf.notes || null,
              appliedTechnique: mf.appliedTechnique || null,
              aerobicSeries: mf.aerobicSeries || 1,
              sectionId: mf.sectionId || defaultSection.id,
              ...(mf.nutritionComponents && Array.isArray(mf.nutritionComponents) && mf.nutritionComponents.length > 0 && {
                nutritionComponents: {
                  create: mf.nutritionComponents.map((ml: any) => ({
                    repetitionNumber: ml.repetitionNumber,
                    distance: ml.distance,
                    time: ml.time,
                    reps: ml.reps,
                    muscularSector: ml.muscularSector || null,
                    exercise: ml.exercise || null,
                    speed: ml.speed,
                    pace: ml.pace,
                    pause: ml.pause,
                    restType: ml.restType as any,
                    rowPerMin: ml.rowPerMin || ml.rowsPerMinute, // Support both field names for compatibility
                    status: ml.status || 'PENDING', // Default status
                    notes: ml.notes || null
                  }))
                }
              })
            }))
          }
        })
      },
      include: {
        nutritionFoods: {
          include: {
            section: true,
            nutritionComponents: {
              orderBy: { repetitionNumber: 'asc' }
            }
          },
          orderBy: { letter: 'asc' }
        },
        sports: true
      }
    });

    console.log('✅ NutritionMeal session created successfully:', session.id);
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error creating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to create workout session' },
      { status: 500 }
    );
  }
}

