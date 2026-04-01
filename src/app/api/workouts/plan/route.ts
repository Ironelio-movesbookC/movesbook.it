import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaConnect } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

// Disable caching for this API route
export const dynamic = 'force-dynamic';
export const revalidate = 0;


// Helper function to get the Monday of the current week
function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  console.log(`📅 getMondayOfWeek input: ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} (day ${day})`);
  
  // Calculate days to subtract to get to Monday of this week
  // Sunday (0) → go back 6 days to reach Monday
  // Monday (1) → stay (0 days back)
  // Tuesday (2) → go back 1 day
  // Wednesday (3) → go back 2 days
  // Thursday (4) → go back 3 days
  // Friday (5) → go back 4 days
  // Saturday (6) → go back 5 days
  const daysToSubtract = day === 0 ? 6 : day - 1;
  
  d.setDate(d.getDate() - daysToSubtract);
  
  console.log(`📅 getMondayOfWeek output: ${d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })} (went back ${daysToSubtract} days)`);
  
  return d;
}

// Helper function to get the next Monday (or current day if it's Monday)
function getNextMonday(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  
  // If today is Monday, return today
  if (day === 1) {
    return d;
  }
  
  // Calculate days to add to get to next Monday
  // Sunday (0) -> add 1 day
  // Tuesday (2) -> add 6 days
  // Wednesday (3) -> add 5 days
  // Thursday (4) -> add 4 days
  // Friday (5) -> add 3 days
  // Saturday (6) -> add 2 days
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

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'TEMPLATE_WEEKS';
    const section = searchParams.get('section') || 'A'; // Section A, B, or C
    const forceRecreate = searchParams.get('forceRecreate') === 'true';
    
    console.log('GET - Finding NEWEST plan for type:', type, 'section:', section, '| Force recreate:', forceRecreate);

    // Calculate date ranges for sections
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    console.log('📅 Today (server time):', today.toISOString(), '/', today.toLocaleDateString(), 'Day of week:', today.getDay());
    
    // Calculate Monday of current week for proper date alignment
    const mondayOfThisWeek = getMondayOfWeek(today);
    console.log('📅 Monday of this week:', mondayOfThisWeek.toLocaleDateString());
    
    // NEW LOGIC: Section A uses TEMPLATE_WEEKS (generic template weeks with no dates)
    // Section B uses YEARLY_PLAN (full year from start date)
    // Legacy support: CURRENT_WEEKS maps to TEMPLATE_WEEKS for backward compatibility
    const actualPlanType = type === 'CURRENT_WEEKS' ? 'TEMPLATE_WEEKS' : type;
    
    // Date filter based on section type
    // NOTE: For Section A (CURRENT_WEEKS), we don't filter by date because
    // the plan itself is created with exactly 3 weeks starting from Monday
    let dateFilter: any = {};
    
    if (type === 'YEARLY_PLAN') {
      // Section B: Show ALL weeks (no date filter)
      // User sets their own start date, so show all 52 weeks from that date
      console.log(`Section B: No date filter, showing all 52 weeks from user's chosen start date`);
    } else if (type === 'WORKOUTS_DONE') {
      // Section C: Show all 52 weeks (same as Section B) - no date filter
      // This allows users to fill in completed workouts for the entire year
      // No date filter for Section C
      console.log('Section C: No date filter, showing all 52 weeks (same structure as Section B)');
    } else if (type === 'ARCHIVE') {
      // Section D: No specific date filter, can show any archived data
      console.log(`Section D: No date filter, showing all archived days`);
    } else {
      console.log(`Section ${type}: No date filter, showing all days in plan`);
    }

    // Determine storage zone for this plan type
    // For TEMPLATE_WEEKS, use the section (A, B, or C) as the storage zone
    let planStorageZone: 'A' | 'B' | 'C' | 'D' = section as 'A' | 'B' | 'C';
    
    if (actualPlanType === 'YEARLY_PLAN') {
      planStorageZone = 'B';
    } else if (actualPlanType === 'WORKOUTS_DONE') {
      planStorageZone = 'C';
    } else if (actualPlanType === 'ARCHIVE') {
      planStorageZone = 'D';
    }

    // Get or create workout plan - ORDER BY NEWEST FIRST!
    // For TEMPLATE_WEEKS (Sections A, B, C), filter by both type AND storageZone
    let plan = await prisma.workoutPlan.findFirst({
      where: {
        userId: decoded.userId,
        type: actualPlanType as any,
        ...(actualPlanType === 'TEMPLATE_WEEKS' ? { storageZone: planStorageZone } : {})
      },
      include: {
        weeks: {
          include: {
            period: true, // Include week-level period
            days: {
              where: {
                // For YEARLY_PLAN (Section B), don't filter by storageZone - show all days in the plan
                ...(actualPlanType !== 'YEARLY_PLAN' ? { storageZone: planStorageZone } : {}),
                ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
              },
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
      },
      orderBy: {
        createdAt: 'desc' // GET NEWEST PLAN FIRST!
      }
    });

    console.log('GET - Found plan:', plan?.id, 'with', plan?.weeks?.length || 0, 'weeks');
    
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

    // Check if plan is empty or doesn't start on Monday
    let isPlanEmpty = false;
    let needsRecreation = false;
    
    if (plan) {
      // Check if empty
      if (plan.weeks.length === 0) {
        isPlanEmpty = true;
        console.log('⚠️ Plan has no weeks!');
      } else {
        const totalDays = plan.weeks.reduce((sum, week) => sum + (week.days?.length || 0), 0);
        if (totalDays === 0) {
          isPlanEmpty = true;
          console.log('⚠️ Plan has weeks but no days!');
        }
        // Note: Don't check week count for YEARLY_PLAN because date filtering may reduce visible weeks
        // The plan itself has all 52 weeks, but the API only returns weeks matching the date filter
      }
      
      // Check if plan starts on Monday
      if (!isPlanEmpty && plan.startDate) {
        const planStart = new Date(plan.startDate);
        planStart.setHours(0, 0, 0, 0);
        const dayOfWeek = planStart.getDay(); // 0 = Sunday, 1 = Monday
        if (dayOfWeek !== 1) {
          needsRecreation = true;
          console.log(`⚠️ Plan does not start on Monday! It starts on day ${dayOfWeek} (${planStart.toLocaleDateString('en-US', { weekday: 'long' })})`);
        }
        
        // For YEARLY_PLAN, accept any start date as long as it's a Monday
        // User can create a plan starting from any date (past, present, or future)
        // We only check that it starts on Monday (already checked above)
        if (actualPlanType === 'YEARLY_PLAN' && !needsRecreation) {
          console.log(`   ✓ Yearly Plan starts on ${planStart.toLocaleDateString()} - keeping it`);
        }
      }
    }

    // Check if plan was created recently (within last 5 seconds) to prevent race condition
    const isRecentlyCreated = plan && (
      (Date.now() - new Date(plan.createdAt).getTime()) < 5000
    );

    // If plan is empty, doesn't start on Monday, or force recreate is requested, delete and recreate it
    // IMPORTANT: For TEMPLATE_WEEKS and YEARLY_PLAN, only recreate if explicitly forced - don't auto-recreate to prevent data loss
    // ALSO: Don't recreate if plan was just created (prevents race condition from parallel API calls)
    const shouldRecreate = plan && !isRecentlyCreated && (
      forceRecreate || 
      (type !== 'TEMPLATE_WEEKS' && type !== 'YEARLY_PLAN' && (isPlanEmpty || needsRecreation))
    );
    
    if (shouldRecreate && plan) {
      const reason = forceRecreate ? 'force recreate requested' : 
                     isPlanEmpty ? 'empty plan' : 
                     'plan does not start on Monday';
      console.log(`🗑️ Deleting plan (${reason}) to recreate with correct data...`);
      
      // Calculate the date range for cleanup based on plan type
      let cleanupStartDate: Date;
      let cleanupEndDate: Date;
      
      if (actualPlanType === 'TEMPLATE_WEEKS') {
        // TEMPLATE_WEEKS: 3 rolling weeks (previous, current, next)
        cleanupStartDate = new Date(mondayOfThisWeek.getTime() - (7 * 24 * 60 * 60 * 1000)); // Previous Monday
        cleanupEndDate = new Date(cleanupStartDate);
        cleanupEndDate.setDate(cleanupEndDate.getDate() + 27); // 4 weeks buffer
      } else if (actualPlanType === 'YEARLY_PLAN') {
        // For YEARLY_PLAN, start from Monday of previous week
        cleanupStartDate = new Date(mondayOfThisWeek.getTime() - (7 * 24 * 60 * 60 * 1000));
        cleanupEndDate = new Date(cleanupStartDate);
        cleanupEndDate.setDate(cleanupEndDate.getDate() + 400); // Yearly plan range
      } else {
        // For other sections, use current week
        cleanupStartDate = mondayOfThisWeek;
        cleanupEndDate = new Date(cleanupStartDate);
        cleanupEndDate.setDate(cleanupEndDate.getDate() + 400);
      }
      
      console.log(`   Date range cleanup: ${cleanupStartDate.toLocaleDateString()} to ${cleanupEndDate.toLocaleDateString()}`);
      
      // Determine storage zone for cleanup
      let cleanupStorageZone: 'A' | 'B' | 'C' | 'D' = planStorageZone; // Use the section-specific storage zone
      if (actualPlanType === 'YEARLY_PLAN') {
        cleanupStorageZone = 'B';
      } else if (actualPlanType === 'WORKOUTS_DONE') {
        cleanupStorageZone = 'C';
      }

      // Step 1: Delete workout days ONLY for this storageZone in the date range
      const deletedDaysInRange = await prisma.workoutDay.deleteMany({
        where: {
          userId: decoded.userId,
          storageZone: cleanupStorageZone,
          date: {
            gte: cleanupStartDate,
            lte: cleanupEndDate
          }
        }
      });
      console.log(`   ✓ Deleted ${deletedDaysInRange.count} workout days in storageZone ${cleanupStorageZone}`);
      
      // Step 2: Delete all weeks from this plan
      const deletedWeeks = await prisma.workoutWeek.deleteMany({
        where: {
          workoutPlanId: plan.id
        }
      });
      console.log(`   ✓ Deleted ${deletedWeeks.count} workout weeks`);
      
      // Step 3: Delete the plan itself
      await prisma.workoutPlan.delete({ where: { id: plan.id } });
      plan = null; // Force recreation
      console.log('   ✓ Old plan deleted, will create new one starting on Monday');
    }

    // If plan doesn't exist, create it
    if (!plan) {
      let startDate = new Date();
      let endDate = new Date();
      let numberOfWeeks = 0;
      
      if (actualPlanType === 'TEMPLATE_WEEKS') {
        // Section A: 3 weeks rolling plan (previous week, current week, next week)
        // Uses REAL current dates - overlapping with Section B is OK due to storageZone
        startDate = new Date(mondayOfThisWeek);
        startDate.setDate(startDate.getDate() - 7); // Start from previous Monday
        console.log(`✓ Section A (3 Weeks): Previous, Current, Next week starting ${startDate.toLocaleDateString()}`);
        
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 20); // 3 weeks = 21 days (0-20)
        numberOfWeeks = 3; // Always 3 weeks
        console.log(`✓ Section A (3 Weeks Plan): ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      } else if (actualPlanType === 'YEARLY_PLAN') {
        // Section B: YEARLY_PLAN
        // Start from Monday of PREVIOUS week (so Section A can show Week 1 as previous week)
        // Section A will dynamically filter to show: previous week, current week, next week
        startDate = new Date(mondayOfThisWeek);
        startDate.setDate(startDate.getDate() - 7); // Go back 1 week to include previous week
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 364); // 52 weeks = 364 days
        numberOfWeeks = 52; // Create all 52 weeks for yearly plan
        console.log(`✓ Year Plan will start on Monday of PREVIOUS week: ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
      } else if (actualPlanType === 'WORKOUTS_DONE') {
        // Section C: Historical data, no pre-created weeks
        // Use a past date range (last year to today)
        startDate = new Date(today);
        startDate.setDate(startDate.getDate() - 365); // 1 year ago
        endDate = new Date(today);
        numberOfWeeks = 0; // Don't create weeks automatically
        console.log(`✓ Section C (Workouts Done): Date range ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      } else if (actualPlanType === 'ARCHIVE') {
        // Section D: Archive, no pre-created weeks
        // Use a wide date range for flexibility
        startDate = new Date(today);
        startDate.setFullYear(startDate.getFullYear() - 2); // 2 years ago
        endDate = new Date(today);
        endDate.setFullYear(endDate.getFullYear() + 1); // 1 year ahead
        numberOfWeeks = 0; // Don't create weeks automatically
        console.log(`✓ Section D (Archive): Date range ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      }

      console.log(`📝 Creating new ${type} plan:`, {
        numberOfWeeks,
        startDate: startDate.toISOString(),
        startDateLocal: startDate.toLocaleDateString(),
        endDate: endDate.toISOString(),
        endDateLocal: endDate.toLocaleDateString(),
        todayWas: today.toISOString()
      });

      // Get or create default period
      let defaultPeriod = await prisma.period.findFirst({
        where: { userId: decoded.userId }
      });
      
      if (!defaultPeriod) {
        console.log('No period found, creating default...');
        defaultPeriod = await prisma.period.create({
          data: {
            userId: decoded.userId,
            name: 'Base Period',
            description: 'Default training period',
            color: '#3b82f6'
          }
        });
      }

      // Create plan with weeks and days
      console.log(`🆕 Creating NEW plan with type: '${actualPlanType}', name: '${actualPlanType === 'TEMPLATE_WEEKS' ? '3 Weeks Plan' : actualPlanType === 'YEARLY_PLAN' ? 'Yearly Plan' : actualPlanType === 'WORKOUTS_DONE' ? 'Workouts Done' : 'Archive'}', weeks: ${numberOfWeeks}`);
      
      const newPlan = await prisma.workoutPlan.create({
        data: {
          userId: decoded.userId,
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

      // Determine storage zone based on plan type
      // For TEMPLATE_WEEKS, use the section-specific storage zone
      let dayStorageZone: 'A' | 'B' | 'C' | 'D' = planStorageZone; // Use the section's storage zone
      if (actualPlanType === 'YEARLY_PLAN') {
        dayStorageZone = 'B';
      } else if (actualPlanType === 'WORKOUTS_DONE') {
        dayStorageZone = 'C';
      } else if (actualPlanType === 'ARCHIVE') {
        dayStorageZone = 'D';
      }

      // Create weeks and days (only for sections that need pre-created structure)
      if (numberOfWeeks > 0) {
        for (let i = 0; i < numberOfWeeks; i++) {
          const week = await prisma.workoutWeek.create({
            data: {
              workoutPlanId: newPlan.id,
              weekNumber: i + 1
            }
          });
          
          // Create all 7 days for this week
          const weekStartDate = new Date(startDate);
          weekStartDate.setDate(weekStartDate.getDate() + (i * 7));
          
          for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
            const dayDate = new Date(weekStartDate);
            dayDate.setDate(weekStartDate.getDate() + (dayOfWeek - 1));
            
            // Use upsert with userId + date + storageZone to allow same date in different sections
            await prisma.workoutDay.upsert({
              where: {
                userId_date_storageZone: {
                  userId: decoded.userId,
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
                userId: decoded.userId,
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
            include: {
              period: true, // Include week-level period
              days: {
                where: {
                  storageZone: loadStorageZone,  // CRITICAL: Only load days from this section!
                  ...(Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {})
                },
                include: {
                  period: true,
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
        
        console.log(`✓ Final: Showing ${plan.weeks.length} weeks`);
        console.log(`   Renumbered as Week 1, 2, 3 (originally weeks ${filteredWeeks.map((w: any) => w.weekNumber).join(', ')})`);
      } else {
        // Fallback: show first 3 weeks if current week couldn't be determined
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
        console.log('⚠️ Could not determine current week, showing first 3 weeks renumbered as 1, 2, 3');
      }
      } // End of CURRENT_WEEKS else-if
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

    console.log('POST /api/workouts/plan - Request received');
    
    const body = await request.json();
    const { name, type, startDate: requestedStartDate, numberOfWeeks, autoCreateDays } = body;
    
    console.log('Request body:', { name, type, numberOfWeeks, autoCreateDays, requestedStartDate });

    // Ensure startDate is always a Monday
    const startDate = getMondayOfWeek(new Date(requestedStartDate));
    console.log(`✓ Adjusted start date to Monday: ${startDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + (numberOfWeeks * 7));

    // Get or create default period
    console.log('Looking for existing period...');
    let defaultPeriod = await prisma.period.findFirst({
      where: { userId: decoded.userId }
    });
    
    if (!defaultPeriod) {
      console.log('No period found, creating default...');
      defaultPeriod = await prisma.period.create({
        data: {
          userId: decoded.userId,
          name: 'Base Period',
          description: 'Default training period',
          color: '#3b82f6'
        }
      });
      console.log('Default period created:', defaultPeriod.id);
    } else {
      console.log('Using existing period:', defaultPeriod.id);
    }

    // Create plan
    console.log('Creating workout plan...');
    // Determine storageZone for TEMPLATE_WEEKS plans
    let storageZoneForPlan = null;
    if (type === 'TEMPLATE_WEEKS') {
      // Default to 'A' if not specified, but should be passed in request
      storageZoneForPlan = 'A'; // This should ideally come from request body
    }

    const plan = await prisma.workoutPlan.create({
      data: {
        userId: decoded.userId,
        name,
        type: type as any,
        storageZone: storageZoneForPlan,
        startDate: startDate, // Already a Date object adjusted to Monday
        endDate
      }
    });
    console.log('Plan created with ID:', plan.id, 'starting on', startDate.toLocaleDateString('en-US', { weekday: 'long' }));

    // Generate weeks - For Section A (TEMPLATE_WEEKS), create all 3 weeks immediately
    // For others, create first 10 weeks (or all if <= 10)
    let weeksToCreate;
    if (type === 'TEMPLATE_WEEKS' || type === 'CURRENT_WEEKS') {
      weeksToCreate = numberOfWeeks; // Always create all weeks for Section A (3 weeks)
      console.log(`Section A (Template Weeks): Creating all ${weeksToCreate} weeks with all days`);
    } else {
      weeksToCreate = Math.min(numberOfWeeks, 10); // Create first 10 weeks for other sections
      console.log(`Will create ${weeksToCreate} weeks (requested ${numberOfWeeks}, creating initial batch)`);
    }
    
    for (let i = 0; i < weeksToCreate; i++) {
      console.log(`Creating week ${i + 1}...`);
      
      try {
        const week = await prisma.workoutWeek.create({
          data: {
            workoutPlanId: plan.id,
            weekNumber: i + 1
          }
        });
        console.log(`Week ${i + 1} created: ${week.id}`);
        
        // Create all 7 days for this week
        const weekStartDate = new Date(startDate);
        weekStartDate.setDate(weekStartDate.getDate() + (i * 7));
        
        // Determine storage zone based on plan type
        let storageZone: 'A' | 'B' | 'C' | 'D' = 'B'; // Default
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
          
          // Use upsert to avoid duplicate key violations on userId + date + storageZone
          await prisma.workoutDay.upsert({
            where: {
              userId_date_storageZone: {
                userId: decoded.userId,
                date: dayDate,
                storageZone
              }
            },
            update: {
              workoutWeekId: week.id,
              dayOfWeek,
              weekNumber: i + 1,
              periodId: defaultPeriod.id,
              storageZone // Update storage zone
            },
            create: {
              workoutWeekId: week.id,
              userId: decoded.userId,
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
        console.log(`Week ${i + 1}: All 7 days created`);
      } catch (weekError) {
        console.error(`Error creating week ${i + 1}:`, weekError);
        throw weekError;
      }
    }
    
    console.log('All weeks created successfully!');

    // Return plan with weeks
    const fullPlan = await prisma.workoutPlan.findUnique({
      where: { id: plan.id },
      include: {
        weeks: {
          include: {
            period: true, // Include week-level period
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
    
    console.log('Returning plan with', fullPlan?.weeks?.length, 'weeks');

    return NextResponse.json({ plan: fullPlan });
  } catch (error) {
    console.error('Error creating workout plan:', error);
    return NextResponse.json(
      { error: 'Failed to create workout plan', details: (error as Error).message },
      { status: 500 }
    );
  }
}



