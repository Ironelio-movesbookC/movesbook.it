import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaConnect } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

// Disable caching for this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;


function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const daysToSubtract = day === 0 ? 6 : day - 1;
  
  d.setDate(d.getDate() - daysToSubtract);
  
  console.log(`📅 getMondayOfWeek output: ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} (went back ${daysToSubtract} days)`);
  
  return d;
}

function getNextMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  
  if (day === 1) {
    return d;
  }
  const daysToAdd = day === 0 ? 1 : 8 - day;
  
  d.setDate(d.getDate() + daysToAdd);
  return d;
}

export async function GET(request: NextRequest) {
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

    await prismaConnect();

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'TEMPLATE_WEEKS';
    const section = searchParams.get('section') || 'A'; // Section A, B, or C
    const forceRecreate = searchParams.get('forceRecreate') === 'true';
    const minimal = searchParams.get('minimal') === 'true';
    

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    
    const mondayOfThisWeek = getMondayOfWeek(today);
    
    const actualPlanType = type === 'CURRENT_WEEKS' ? 'TEMPLATE_WEEKS' : type;
    
    let dateFilter: any = {};
    
    let planStorageZone: 'A' | 'B' | 'C' | 'D' = section as 'A' | 'B' | 'C';
    
    if (actualPlanType === 'YEARLY_PLAN') {
      planStorageZone = 'B';
    } else if (actualPlanType === 'WORKOUTS_DONE') {
      planStorageZone = 'C';
    } else if (actualPlanType === 'ARCHIVE') {
      planStorageZone = 'D';
    }

    let plan = await prisma.workoutPlan.findFirst({
      where: {
        userId: dbUserId,
        type: actualPlanType as any,
        ...(actualPlanType === 'TEMPLATE_WEEKS' ? { storageZone: planStorageZone } : {})
      },
      include: {
        weeks: {
          select: {
            id: true,
            workoutPlanId: true,
            weekNumber: true,
            createdAt: true,
            periodId: true,
            notes: true,
            period: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true
              }
            },
            days: {
              where: {
                ...(actualPlanType !== 'YEARLY_PLAN' ? { storageZone: planStorageZone } : {}),
                ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
              },
              select: {
                id: true,
                workoutWeekId: true,
                date: true,
                weekNumber: true,
                dayOfWeek: true,
                periodId: true,
                weather: true,
                feelingStatus: true,
                notes: true,
                createdAt: true,
                userId: true,
                assignedToUserId: true,
                creatorRole: true,
                isFromSharedSource: true,
                originalSenderId: true,
                storageZone: true,
                period: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    color: true
                  }
                },
                plannedActions: {
                  orderBy: { sortOrder: 'asc' },
                  select: {
                    id: true,
                    templateId: true,
                    nameSnapshot: true,
                    iconSnapshot: true,
                    colorSnapshot: true,
                    description: true,
                    textColor: true,
                    backgroundColor: true,
                    url: true,
                    sortOrder: true,
                    createdAt: true
                  }
                },
                ...(minimal
                  ? {}
                  : {
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
                    })
              },
              orderBy: { dayOfWeek: 'asc' }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
      },
      orderBy: {
        createdAt: 'desc' // GET NEWEST PLAN FIRST!
      }
    });

    
    if (plan) {
      const planStartDate = new Date(plan.startDate);
      const totalDaysInPlan = plan.weeks.reduce((sum, week) => sum + (week.days?.length || 0), 0);
      console.log('📊 Existing plan details:', {
        id: plan.id,
        type: plan.type,
        startDate: plan.startDate,
        startDateFormatted: planStartDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }),
        endDate: plan.endDate,
        weeksCount: plan.weeks?.length || 0,
        totalDays: totalDaysInPlan,
        createdAt: plan.createdAt,
        firstWeekDates: plan.weeks?.[0]?.days?.[0]?.date ? 
          `${new Date(plan.weeks[0].days[0].date).toLocaleDateString()} to ${new Date(plan.weeks[0].days[plan.weeks[0].days.length - 1].date).toLocaleDateString()}` 
          : 'N/A'
      });
      console.log(`   Monday of current week should be: ${mondayOfThisWeek.toLocaleDateString()}`);
      if (type === 'YEARLY_PLAN') {
      console.log(`   Plan SHOULD start from: ${new Date(mondayOfThisWeek.getTime() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString()} (previous Monday)`);
      }
    }

    let isPlanEmpty = false;
    let needsRecreation = false;
    
    if (plan) {
      if (plan.weeks.length === 0) {
        isPlanEmpty = true;
        console.log('⚠️ Plan has no weeks!');
      } else {
        const totalDays = plan.weeks.reduce((sum, week) => sum + (week.days?.length || 0), 0);
        if (totalDays === 0) {
          isPlanEmpty = true;
          console.log('⚠️ Plan has weeks but no days!');
        }
      }
      
      if (!isPlanEmpty && plan.startDate) {
        const planStart = new Date(plan.startDate);
        planStart.setHours(0, 0, 0, 0);
        const dayOfWeek = planStart.getDay(); // 0 = Sunday, 1 = Monday
        if (dayOfWeek !== 1) {
          needsRecreation = true;
          console.log(`⚠️ Plan does not start on Monday! It starts on day ${dayOfWeek} (${planStart.toLocaleDateString('en-US', { weekday: 'long' })})`);
        }

        if (actualPlanType === 'YEARLY_PLAN' && !needsRecreation) {
          console.log(`   ✓ Yearly Plan starts on ${planStart.toLocaleDateString()} - keeping it`);
        }
      }
    }

    const isRecentlyCreated = plan && (
      (Date.now() - new Date(plan.createdAt).getTime()) < 5000
    );

    const shouldRecreate = plan && !isRecentlyCreated && (
      forceRecreate || 
      (type !== 'TEMPLATE_WEEKS' && type !== 'YEARLY_PLAN' && (isPlanEmpty || needsRecreation))
    );
    
    if (shouldRecreate && plan) {
      const reason = forceRecreate ? 'force recreate requested' : 
                     isPlanEmpty ? 'empty plan' : 
                     'plan does not start on Monday';
      
      let cleanupStartDate: Date;
      let cleanupEndDate: Date;
      
      if (actualPlanType === 'TEMPLATE_WEEKS') {
        cleanupStartDate = new Date(mondayOfThisWeek.getTime() - (7 * 24 * 60 * 60 * 1000)); // Previous Monday
        cleanupEndDate = new Date(cleanupStartDate);
        cleanupEndDate.setDate(cleanupEndDate.getDate() + 27); // 4 weeks buffer
      } else if (actualPlanType === 'YEARLY_PLAN') {
        cleanupStartDate = new Date(mondayOfThisWeek.getTime() - (7 * 24 * 60 * 60 * 1000));
        cleanupEndDate = new Date(cleanupStartDate);
        cleanupEndDate.setDate(cleanupEndDate.getDate() + 400); // Yearly plan range
      } else {
        cleanupStartDate = mondayOfThisWeek;
        cleanupEndDate = new Date(cleanupStartDate);
        cleanupEndDate.setDate(cleanupEndDate.getDate() + 400);
      }
      
      let cleanupStorageZone: 'A' | 'B' | 'C' | 'D' = planStorageZone;
      if (actualPlanType === 'YEARLY_PLAN') {
        cleanupStorageZone = 'B';
      } else if (actualPlanType === 'WORKOUTS_DONE') {
        cleanupStorageZone = 'C';
      }

      const deletedDaysInRange = await prisma.workoutDay.deleteMany({
        where: {
          userId: dbUserId,
          storageZone: cleanupStorageZone,
          date: {
            gte: cleanupStartDate,
            lte: cleanupEndDate
          }
        }
      });
      
      const deletedWeeks = await prisma.workoutWeek.deleteMany({
        where: {
          workoutPlanId: plan.id
        }
      });
      
      await prisma.workoutPlan.delete({ where: { id: plan.id } });
      plan = null;
    }

    if (!plan) {
      let startDate = new Date();
      let endDate = new Date();
      let numberOfWeeks = 0;
      
      if (actualPlanType === 'TEMPLATE_WEEKS') {
        startDate = new Date(mondayOfThisWeek);
        startDate.setDate(startDate.getDate() - 7);
        
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 20);
        numberOfWeeks = 3;
      } else if (actualPlanType === 'YEARLY_PLAN') {
        startDate = new Date(mondayOfThisWeek);
        startDate.setDate(startDate.getDate() - 7);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 364);
        numberOfWeeks = 52;
      } else if (actualPlanType === 'WORKOUTS_DONE') {
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 365);
        endDate = new Date(today);
        numberOfWeeks = 0;
      } else if (actualPlanType === 'ARCHIVE') {
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 2);
        endDate = new Date(today);
        endDate.setFullYear(endDate.getFullYear() + 1);
        numberOfWeeks = 0;
      }


      let defaultPeriod = await prisma.period.findFirst({
        where: { userId: dbUserId }
      });
      
      if (!defaultPeriod) {
        defaultPeriod = await prisma.period.create({
          data: {
            userId: dbUserId,
            name: 'Base Period',
            description: 'Default training period',
            color: '#3b82f6'
          }
        });
      }

      const newPlan = await prisma.workoutPlan.create({
        data: {
          userId: dbUserId,
          name: actualPlanType === 'TEMPLATE_WEEKS' ? `Weekly Plan ${section}` :
                actualPlanType === 'YEARLY_PLAN' ? 'Yearly Plan' : 
                actualPlanType === 'WORKOUTS_DONE' ? 'Workouts Done' : 'Archive',
          type: actualPlanType as any,
          storageZone: actualPlanType === 'TEMPLATE_WEEKS' ? planStorageZone : null,
          startDate,
          endDate
        }
      });
      
      console.log(`✅ Created plan ${newPlan.id} with type: ${newPlan.type}`);

      let dayStorageZone: 'A' | 'B' | 'C' | 'D' = planStorageZone;
      if (actualPlanType === 'YEARLY_PLAN') {
        dayStorageZone = 'B';
      } else if (actualPlanType === 'WORKOUTS_DONE') {
        dayStorageZone = 'C';
      } else if (actualPlanType === 'ARCHIVE') {
        dayStorageZone = 'D';
      }

      if (numberOfWeeks > 0) {
        for (let i = 0; i < numberOfWeeks; i++) {
          const week = await prisma.workoutWeek.create({
            data: {
              workoutPlanId: newPlan.id,
              weekNumber: i + 1
            }
          });
          
          const weekStartDate = new Date(startDate);
          weekStartDate.setDate(weekStartDate.getDate() + (i * 7));
          
          for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
            const dayDate = new Date(weekStartDate);
            dayDate.setDate(weekStartDate.getDate() + (dayOfWeek - 1));
            
            await prisma.workoutDay.upsert({
              where: {
                userId_date_storageZone: {
                  userId: dbUserId,
                  date: dayDate,
                  storageZone: dayStorageZone
                }
              },
              update: {
                workoutWeekId: week.id,
                dayOfWeek,
                weekNumber: i + 1,
                periodId: defaultPeriod.id,
                storageZone: dayStorageZone
              },
              create: {
                workoutWeekId: week.id,
                userId: dbUserId,
                dayOfWeek,
                weekNumber: i + 1,
                date: dayDate,
                periodId: defaultPeriod.id,
                storageZone: dayStorageZone,
                weather: '',
                feelingStatus: '5',
                notes: ''
              }
            });
          }
        }

        console.log(`Created plan with ${numberOfWeeks} weeks and ${numberOfWeeks * 7} days`);
      } else {
        console.log(`Created empty plan for ${type} (no pre-created weeks/days)`);
      }

      // Determine storage zone for loading days
      let loadStorageZone: 'A' | 'B' | 'C' | 'D' = 'B';
      if (actualPlanType === 'TEMPLATE_WEEKS') {
        loadStorageZone = 'A';
      } else if (actualPlanType === 'YEARLY_PLAN') {
        loadStorageZone = 'B';
      } else if (actualPlanType === 'WORKOUTS_DONE') {
        loadStorageZone = 'C';
      } else if (actualPlanType === 'ARCHIVE') {
        loadStorageZone = 'D';
      }

      console.log(`📦 Loading newly created plan ${newPlan.id} with storageZone filter: ${loadStorageZone}`);
      console.log(`📦 Date filter:`, Object.keys(dateFilter).length > 0 ? dateFilter : 'NONE');
      
      // Fetch the complete plan with all includes, date filter, and storageZone filter
      plan = await prisma.workoutPlan.findUnique({
        where: { id: newPlan.id },
        include: {
          weeks: {
            select: {
              id: true,
              workoutPlanId: true,
              weekNumber: true,
              createdAt: true,
              periodId: true,
              notes: true,
              period: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color: true
                }
              },
              days: {
                where: {
                  storageZone: loadStorageZone,  // CRITICAL: Only load days from this section!
                  ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
                },
                select: {
                  id: true,
                  workoutWeekId: true,
                  date: true,
                  weekNumber: true,
                  dayOfWeek: true,
                  periodId: true,
                  weather: true,
                  feelingStatus: true,
                  notes: true,
                  createdAt: true,
                  userId: true,
                  assignedToUserId: true,
                  creatorRole: true,
                  isFromSharedSource: true,
                  originalSenderId: true,
                  storageZone: true,
                  period: {
                    select: {
                      id: true,
                      name: true,
                      description: true,
                      color: true
                    }
                  },
                  plannedActions: {
                    orderBy: { sortOrder: 'asc' },
                    select: {
                      id: true,
                      templateId: true,
                      nameSnapshot: true,
                      iconSnapshot: true,
                      colorSnapshot: true,
                      description: true,
                      textColor: true,
                      backgroundColor: true,
                      url: true,
                      sortOrder: true,
                      createdAt: true
                    }
                  },
                  ...(minimal
                    ? {}
                    : {
                        workouts: {
                          include: {
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
                      })
                },
                orderBy: { dayOfWeek: 'asc' }
              }
            },
            orderBy: { weekNumber: 'asc' }
          }
        }
      });
      
      console.log(`📦 Loaded plan has ${plan?.weeks?.length || 0} weeks BEFORE filtering`);
      if (plan?.weeks) {
        plan.weeks.forEach((week: any, idx: number) => {
          console.log(`   Week ${idx + 1}: ${week.days?.length || 0} days`);
        });
      }
      
      // Filter out weeks with no days (after date filtering)
      // But keep all weeks for YEARLY_PLAN to show full year structure
      if (plan && plan.weeks && actualPlanType !== 'YEARLY_PLAN') {
        const beforeFilterCount = plan.weeks.length;
        plan.weeks = plan.weeks.filter((week: any) => week.days && week.days.length > 0);
        console.log(`📦 After filtering: ${beforeFilterCount} weeks → ${plan.weeks.length} weeks`);
      }
    }
    
    // Also filter weeks on existing plans
    // But keep all weeks for YEARLY_PLAN to show full year structure
    if (plan && plan.weeks && actualPlanType !== 'YEARLY_PLAN') {
      plan.weeks = plan.weeks.filter((week: any) => week.days && week.days.length > 0);
    }
    
    // LEGACY SUPPORT: For old CURRENT_WEEKS requests, just show all template weeks
    // NEW TEMPLATE_WEEKS: Show all 3 template weeks (no filtering needed)
    if ((type === 'CURRENT_WEEKS' || type === 'TEMPLATE_WEEKS') && plan && plan.weeks) {
      // For template weeks, just ensure they're numbered 1, 2, 3
      if (type === 'TEMPLATE_WEEKS') {
        plan.weeks = plan.weeks.slice(0, 3).map((week: any, index: number) => ({
          ...week,
          weekNumber: index + 1,
          days: week.days?.map((day: any) => ({
            ...day,
            weekNumber: index + 1
          }))
        }));
        console.log(`✓ Template Weeks: Showing ${plan.weeks.length} generic weeks`);
      }
      // Legacy CURRENT_WEEKS logic (date-based filtering)
      else if (type === 'CURRENT_WEEKS' && plan && plan.weeks) {
      console.log('📅 Filtering for Section A: Finding previous, current, and next week...');
      console.log('📅 Today:', today.toISOString(), '/', today.toLocaleDateString());
      
      // Find the current week by checking which week's date range contains today
      let currentWeekNumber: number | null = null;
      
      for (const week of plan.weeks) {
        if (week.days && week.days.length > 0) {
          // Get the first and last day of the week
          const sortedDays = [...week.days].sort((a: any, b: any) => 
            new Date(a.date).getTime() - new Date(b.date).getTime()
          );
          const firstDayDate = new Date(sortedDays[0].date);
          const lastDayDate = new Date(sortedDays[sortedDays.length - 1].date);
          firstDayDate.setHours(0, 0, 0, 0);
          lastDayDate.setHours(23, 59, 59, 999);
          
          console.log(`Week ${week.weekNumber}: ${firstDayDate.toLocaleDateString()} to ${lastDayDate.toLocaleDateString()}`);
          
          // Check if today falls within this week's range
          if (today >= firstDayDate && today <= lastDayDate) {
            currentWeekNumber = week.weekNumber;
            console.log(`✓ Today (${today.toLocaleDateString()}) is in week ${currentWeekNumber}`);
            break;
          }
        }
      }
      
      // If current week not found by date range, find the week with Monday closest to today
      if (currentWeekNumber === null) {
        console.log('⚠️ Current week not found by date range, finding closest week...');
        let closestWeek: any = null;
        let smallestDiff = Infinity;
        
        for (const week of plan.weeks) {
          if (week.days && week.days.length > 0) {
            // Find Monday of this week (dayOfWeek === 1)
            const monday = week.days.find((d: any) => {
              const date = new Date(d.date);
              return date.getDay() === 1;
            });
            
            if (monday) {
              const mondayDate = new Date(monday.date);
              mondayDate.setHours(0, 0, 0, 0);
              const diff = Math.abs(today.getTime() - mondayDate.getTime());
              
              if (diff < smallestDiff) {
                smallestDiff = diff;
                closestWeek = week;
              }
            }
          }
        }
        
        if (closestWeek) {
          currentWeekNumber = closestWeek.weekNumber;
          console.log(`✓ Using closest week: ${currentWeekNumber}`);
        }
      }
      
      // Filter to show: previous week, current week, next week
      if (currentWeekNumber !== null) {
        const targetWeeks = [currentWeekNumber - 1, currentWeekNumber, currentWeekNumber + 1];
        const filteredWeeks = plan.weeks.filter((week: any) => targetWeeks.includes(week.weekNumber));
        
        console.log(`✓ Section A target weeks from year plan: ${targetWeeks.join(', ')}`);
        console.log(`✓ Found ${filteredWeeks.length} weeks`);
        
        // If we don't have 3 weeks, try to get the first 3 weeks
        if (filteredWeeks.length < 3) {
          console.log('⚠️ Less than 3 weeks found, using first 3 weeks from plan');
          plan.weeks = plan.weeks.slice(0, 3);
        } else {
          // Sort by weekNumber to ensure correct order
          filteredWeeks.sort((a: any, b: any) => a.weekNumber - b.weekNumber);
          plan.weeks = filteredWeeks;
        }
        
        // RENUMBER: Week 1 = Previous, Week 2 = Current, Week 3 = Next
        // This ensures Section A always shows "Week 1, 2, 3" regardless of year plan week numbers
        plan.weeks = plan.weeks.map((week: any, index: number) => {
          const newWeekNumber = index + 1;
          return {
            ...week,
            weekNumber: newWeekNumber,
            originalWeekNumber: week.weekNumber, // Keep original for reference
            // Also update weekNumber on days to match the renumbered week
            days: week.days?.map((day: any) => ({
              ...day,
              weekNumber: newWeekNumber
            }))
          };
        });
        
      } else {
        plan.weeks = plan.weeks.slice(0, 3).map((week: any, index: number) => {
          const newWeekNumber = index + 1;
          return {
            ...week,
            weekNumber: newWeekNumber,
            originalWeekNumber: week.weekNumber,
            days: week.days?.map((day: any) => ({
              ...day,
              weekNumber: newWeekNumber
            }))
          };
        });
      }
      }
    }

    return NextResponse.json({ plan });
  } catch (error) {
    console.error('Error fetching workout plan:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout plan' },
      { status: 500 }
    );
  }
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

    await prismaConnect();

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, startDate: requestedStartDate, numberOfWeeks } = body;

    const startDate = getMondayOfWeek(new Date(requestedStartDate));

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (numberOfWeeks * 7));

    let defaultPeriod = await prisma.period.findFirst({
      where: { userId: dbUserId }
    });
    
    if (!defaultPeriod) {
      defaultPeriod = await prisma.period.create({
        data: {
          userId: dbUserId,
          name: 'Base Period',
          description: 'Default training period',
          color: '#3b82f6'
        }
      });
    }

    let storageZoneForPlan = null;
    if (type === 'TEMPLATE_WEEKS') {
      storageZoneForPlan = 'A';
    }

    const plan = await prisma.workoutPlan.create({
      data: {
        userId: dbUserId,
        name,
        type: type as any,
        storageZone: storageZoneForPlan,
        startDate: startDate,
        endDate
      }
    });

    let weeksToCreate;
    if (type === 'TEMPLATE_WEEKS' || type === 'CURRENT_WEEKS') {
      weeksToCreate = numberOfWeeks;
    } else {
      weeksToCreate = Math.min(numberOfWeeks, 10);
    }
    
    for (let i = 0; i < weeksToCreate; i++) {
      
      try {
        const week = await prisma.workoutWeek.create({
          data: {
            workoutPlanId: plan.id,
            weekNumber: i + 1
          }
        });
        
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(weekStartDate.getDate() + (i * 7));
        
        let storageZone: 'A' | 'B' | 'C' | 'D' = 'B';
        if (type === 'TEMPLATE_WEEKS') {
          storageZone = 'A';
        } else if (type === 'YEARLY_PLAN') {
          storageZone = 'B';
        } else if (type === 'WORKOUTS_DONE') {
          storageZone = 'C';
        } else if (type === 'ARCHIVE') {
          storageZone = 'D';
        }
        
        for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
          const dayDate = new Date(weekStartDate);
          dayDate.setDate(weekStartDate.getDate() + (dayOfWeek - 1));
          
          await prisma.workoutDay.upsert({
            where: {
              userId_date_storageZone: {
                userId: dbUserId,
                date: dayDate,
                storageZone
              }
            },
            update: {
              workoutWeekId: week.id,
              dayOfWeek,
              weekNumber: i + 1,
              periodId: defaultPeriod.id,
              storageZone
            },
            create: {
              workoutWeekId: week.id,
              userId: dbUserId,
              dayOfWeek,
              weekNumber: i + 1,
              date: dayDate,
              periodId: defaultPeriod.id,
              storageZone, // Set correct storage zone
              weather: '',
              feelingStatus: '5',
              notes: ''
            }
          });
        }
      } catch (weekError) {
        throw weekError;
      }
    }
    

    const fullPlan = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
      include: {
        weeks: {
          include: {
            period: true,
            days: {
              include: {
                period: true,
                workouts: true
              }
            }
          },
          orderBy: { weekNumber: 'asc' }
        }
      }
    });
    

    return NextResponse.json({ plan: fullPlan });
  } catch (error) {
    console.error('Error creating workout plan:', error);
    return NextResponse.json(
      { error: 'Failed to create workout plan', details: (error as Error).message },
      { status: 500 }
    );
  }
}



