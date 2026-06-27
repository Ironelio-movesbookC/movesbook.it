import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

// Helper function to get the Monday of a given week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  const daysToSubtract = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - daysToSubtract);
  return d;
}

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

    const userId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { startDate: requestedStartDate } = body;

    if (!requestedStartDate) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 });
    }

    console.log('POST /api/workouts/plan/create-yearly - Creating yearly plan from date:', requestedStartDate);

    // Ensure startDate is always a Monday
    const startDate = getMondayOfWeek(new Date(requestedStartDate));
    console.log(`✓ Adjusted start date to Monday: ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 364); // 52 weeks = 364 days

    // Store start date in user settings
    await prisma.userSettings.upsert({
      where: { userId: userId },
      update: { yearlyPlanStartDate: startDate },
      create: {
        userId: userId,
        yearlyPlanStartDate: startDate,
        colorSettings: '{}',
        toolsSettings: '{}',
        adminSettings: '{}',
        favouritesSettings: '{}',
        myBestSettings: '{}',
        notificationSettings: '{}',
        socialSettings: '{}',
        workoutPreferences: '{}',
        widgetArrangement: '[]'
      }
    });

    console.log('✓ Saved start date to user settings');

    // Delete existing YEARLY_PLAN if exists
    const existingPlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: userId,
        type: 'YEARLY_PLAN'
      }
    });

    if (existingPlan) {
      console.log('🗑️ Deleting existing yearly plan...');
      
      // Delete all days in the plan's date range
      await prisma.workoutDay.deleteMany({
        where: {
          userId: userId,
          workoutWeek: {
            workoutPlanId: existingPlan.id
          }
        }
      });

      // Delete all weeks
      await prisma.workoutWeek.deleteMany({
        where: {
          workoutPlanId: existingPlan.id
        }
      });

      // Delete the plan
      await prisma.workoutPlan.delete({
        where: { id: existingPlan.id }
      });

      console.log('✓ Old yearly plan deleted');
    }

    // Get or create default period
    let defaultPeriod = await prisma.period.findFirst({
      where: { userId: userId }
    });

    if (!defaultPeriod) {
      console.log('No period found, creating default...');
      defaultPeriod = await prisma.period.create({
        data: {
          userId: userId,
          name: 'Base Period',
          description: 'Default training period',
          color: '#3b82f6'
        }
      });
    }

    // Create new yearly plan
    console.log('Creating new yearly plan...');
    const plan = await prisma.workoutPlan.create({
      data: {
        userId: userId,
        name: 'Yearly Plan',
        type: 'YEARLY_PLAN',
        startDate,
        endDate
      }
    });

    console.log('✓ Plan created with ID:', plan.id);

    // Create all 52 weeks with 7 days each
    const numberOfWeeks = 52;
    console.log(`Creating ${numberOfWeeks} weeks...`);

    for (let i = 0; i < numberOfWeeks; i++) {
      const week = await prisma.workoutWeek.create({
        data: {
          workoutPlanId: plan.id,
          weekNumber: i + 1
        }
      });

      // Create all 7 days for this week
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(weekStartDate.getDate() + (i * 7));

      for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
        const dayDate = new Date(weekStartDate);
        dayDate.setDate(weekStartDate.getDate() + (dayOfWeek - 1));

        await prisma.workoutDay.upsert({
          where: {
            userId_date_storageZone: {
              userId: userId,
              date: dayDate,
              storageZone: 'B'
            }
          },
          update: {
            workoutWeekId: week.id,
            dayOfWeek,
            weekNumber: i + 1,
            periodId: defaultPeriod.id,
            storageZone: 'B' // Yearly Plan = Section B
          },
          create: {
            workoutWeekId: week.id,
            userId: userId,
            dayOfWeek,
            weekNumber: i + 1,
            date: dayDate,
            periodId: defaultPeriod.id,
            storageZone: 'B', // Yearly Plan = Section B
            weather: '',
            feelingStatus: '5',
            notes: ''
          }
        });
      }

      if ((i + 1) % 10 === 0) {
        console.log(`✓ Created ${i + 1} weeks...`);
      }
    }

    console.log(`✓ All ${numberOfWeeks} weeks created successfully!`);

    // Also create "Workouts Done" plan with same structure (blank workouts)
    console.log('Creating "Workouts Done" plan...');
    
    // Delete existing WORKOUTS_DONE if exists
    const existingDonePlan = await prisma.workoutPlan.findFirst({
      where: {
        userId: userId,
        type: 'WORKOUTS_DONE'
      }
    });

    if (existingDonePlan) {
      console.log('🗑️ Deleting existing workouts done plan...');
      
      await prisma.workoutDay.deleteMany({
        where: {
          userId: userId,
          workoutWeek: {
            workoutPlanId: existingDonePlan.id
          }
        }
      });

      await prisma.workoutWeek.deleteMany({
        where: {
          workoutPlanId: existingDonePlan.id
        }
      });

      await prisma.workoutPlan.delete({
        where: { id: existingDonePlan.id }
      });

      console.log('✓ Old workouts done plan deleted');
    }

    // Create "Workouts Done" plan
    const donePlan = await prisma.workoutPlan.create({
      data: {
        userId: userId,
        name: 'Workouts Done',
        type: 'WORKOUTS_DONE',
        startDate,
        endDate
      }
    });

    console.log('✓ Workouts Done plan created with ID:', donePlan.id);

    // Create all 52 weeks for Done plan (without days - they'll be created on-demand)
    // This avoids conflict with Yearly Plan days (unique constraint on userId_date)
    for (let i = 0; i < numberOfWeeks; i++) {
      await prisma.workoutWeek.create({
        data: {
          workoutPlanId: donePlan.id,
          weekNumber: i + 1
        }
      });

      if ((i + 1) % 10 === 0) {
        console.log(`✓ Created ${i + 1} weeks for Done plan...`);
      }
    }

    console.log(`✓ All ${numberOfWeeks} weeks structure created for Workouts Done plan! (Days will be created when workouts are added)`);

    // Fetch the complete plan
    const fullPlan = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
      include: {
        weeks: {
          include: {
            period: true,
            days: {
              include: {
                period: true,
                workouts: {
                  include: {
                    sports: true,
                    moveframes: {
                      include: {
                        section: true,
                        movelaps: {
                          orderBy: { repetitionNumber: 'asc' }
                        }
                      },
                      orderBy: { letter: 'asc' }
                    }
                  },
                  orderBy: { sessionNumber: 'asc' }
                }
              },
              orderBy: { dayOfWeek: 'asc' }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `✅ Yearly Plan (52 weeks) and Workouts Done plan created! Start date: ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}`,
      plan: fullPlan,
      donePlanId: donePlan.id
    });
  } catch (error) {
    console.error('Error creating yearly plan:', error);
    return NextResponse.json(
      { error: 'Failed to create yearly plan', details: (error as Error).message },
      { status: 500 }
    );
  }
}

