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
      workoutDayId,
      dayId, // Alternative field name for workoutDayId
      sessionNumber,
      name,
      code,
      time,
      weather,
      location,
      surface,
      heartRateMax,
      heartRateAvg,
      calories,
      feelingStatus,
      notes,
      status,
      sports,
      symbol,
      includeStretching,
      mainSport,
      mainGoal,
      intensity,
      tags,
      moveframes
    } = body;

    // Use dayId if workoutDayId is not provided
    const actualDayId = workoutDayId || dayId;

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
      moveframesProvided: !!moveframes
    });

    // Validate required fields
    // Note: sessionNumber is optional when copying from favorites
    if (!actualDayId) {
      return NextResponse.json(
        { error: 'Missing required field: dayId or workoutDayId' },
        { status: 400 }
      );
    }

    // Validate sports array (if provided)
    // NOTE: Sports are now optional - they will be auto-loaded from moveframes
    if (sports && Array.isArray(sports) && sports.length > 4) {
      return NextResponse.json(
        { error: 'Maximum 4 sports allowed per workout' },
        { status: 400 }
      );
    }
    
    // Ensure sports is always an array of sport codes (supports legacy string[] or { sport }[])
    const sportsList =
      sports && Array.isArray(sports)
        ? sports
            .map((s: unknown) => {
              if (typeof s === 'string' && s.trim()) return s.trim();
              if (s && typeof s === 'object' && 'sport' in s) {
                const code = (s as { sport: string }).sport;
                return typeof code === 'string' && code.trim() ? code.trim() : null;
              }
              return null;
            })
            .filter((s): s is string => Boolean(s))
        : [];

    // Check existing workouts for this day
    const existingWorkouts = await prisma.workoutSession.findMany({
      where: { workoutDayId: actualDayId },
      select: { id: true }
    });

    // Validate: max 3 workouts per day
    if (existingWorkouts.length >= 3) {
      return NextResponse.json(
        { error: 'Cannot add workout: Maximum 3 workouts per day allowed' },
        { status: 400 }
      );
    }

    // Verify the workout day exists and belongs to user
    const workoutDay = await prisma.workoutDay.findUnique({
      where: { id: actualDayId },
      include: {
        workoutWeek: {
          include: {
            workoutPlan: true
          }
        }
      }
    });

    if (!workoutDay) {
      return NextResponse.json(
        { error: 'Workout day not found' },
        { status: 404 }
      );
    }

    // Check authorization
    if (workoutDay.userId !== decoded.userId) {
      return NextResponse.json(
        { error: 'Unauthorized - this day belongs to another user' },
        { status: 403 }
      );
    }

    // Determine session number automatically if not provided
    let finalSessionNumber = sessionNumber;
    if (!finalSessionNumber) {
      const existingSessions = await prisma.workoutSession.findMany({
        where: { workoutDayId: actualDayId },
        select: { sessionNumber: true },
        orderBy: { sessionNumber: 'desc' }
      });
      finalSessionNumber = existingSessions.length > 0 ? existingSessions[0].sessionNumber + 1 : 1;
    }

    // Check if session number already exists for this day
    const existingSession = await prisma.workoutSession.findFirst({
      where: {
        workoutDayId: actualDayId,
        sessionNumber: finalSessionNumber
      }
    });

    if (existingSession) {
      return NextResponse.json(
        { error: 'Session number already exists for this day' },
        { status: 400 }
      );
    }

    // Check max 3 sessions per day
    const sessionsCount = await prisma.workoutSession.count({
      where: { workoutDayId: actualDayId }
    });

    if (sessionsCount >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 workout sessions per day' },
        { status: 400 }
      );
    }

    // Get or create a default section for moveframes
    let defaultSection = await prisma.workoutSection.findFirst({
      where: { userId: decoded.userId },
      orderBy: { createdAt: 'asc' }
    });

    // If no section exists, create a default one
    if (!defaultSection) {
      defaultSection = await prisma.workoutSection.create({
        data: {
          userId: decoded.userId,
          name: 'Default',
          code: 'DEF',
          description: 'Default section',
          color: '#3B82F6'
        }
      });
    }

    // Create workout session with sports (if any) and moveframes (if provided)
    // Workouts Done (Section C) may also send weather / surface / HR / calories / feeling
    const session = await prisma.workoutSession.create({
      data: {
        workoutDayId: actualDayId,
        sessionNumber: finalSessionNumber,
        name: (typeof name === 'string' && name.trim()) || `Workout ${finalSessionNumber}`,
        code: typeof code === 'string' ? code : '',
        time: typeof time === 'string' ? time : '',
        weather: typeof weather === 'string' ? weather : null,
        location: location || '',
        surface: typeof surface === 'string' ? surface : null,
        heartRateMax:
          heartRateMax !== undefined && heartRateMax !== null && heartRateMax !== ''
            ? parseInt(String(heartRateMax), 10)
            : null,
        heartRateAvg:
          heartRateAvg !== undefined && heartRateAvg !== null && heartRateAvg !== ''
            ? parseInt(String(heartRateAvg), 10)
            : null,
        calories:
          calories !== undefined && calories !== null && calories !== ''
            ? parseInt(String(calories), 10)
            : null,
        feelingStatus: typeof feelingStatus === 'string' ? feelingStatus : null,
        notes:
          notes !== undefined && notes !== null
            ? String(notes)
            : includeStretching
              ? `${symbol || ''} Includes stretching`
              : symbol || '',
        status: status as any || 'PLANNED_FUTURE',
        mainSport: mainSport || null,
        mainGoal: mainGoal || null,
        intensity: intensity || 'Medium',
        tags: tags || null,
        includeStretching: includeStretching !== undefined ? Boolean(includeStretching) : true,
        ...(sportsList.length > 0 && {
          sports: {
            create: sportsList.map((sport: string) => ({
              sport: sport as any
            }))
          }
        }),
        ...(moveframes && Array.isArray(moveframes) && moveframes.length > 0 && {
          moveframes: {
            create: moveframes.map((mf: any) => ({
              letter: mf.letter,
              sport: mf.sport as any,
              type: mf.type || 'STANDARD', // Default to STANDARD if not provided
              quantity: mf.quantity,
              quantityType: mf.quantityType as any,
              repetitions: mf.repetitions,
              rest: mf.rest,
              intensity: mf.intensity,
              speedType: mf.speedType as any,
              description: mf.description ?? '',
              notes: mf.notes || null,
              appliedTechnique: mf.appliedTechnique || null,
              aerobicSeries: mf.aerobicSeries || 1,
              sectionId: mf.sectionId || defaultSection.id,
              ...(mf.movelaps && Array.isArray(mf.movelaps) && mf.movelaps.length > 0 && {
                movelaps: {
                  create: mf.movelaps.map((ml: any) => ({
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
        moveframes: {
          include: {
            section: true,
            movelaps: {
              orderBy: { repetitionNumber: 'asc' }
            }
          },
          orderBy: { letter: 'asc' }
        },
        sports: true
      }
    });

    console.log('✅ Workout session created successfully:', session.id);
    return NextResponse.json({ session });
  } catch (error) {
    console.error('Error creating workout session:', error);
    return NextResponse.json(
      { error: 'Failed to create workout session' },
      { status: 500 }
    );
  }
}

