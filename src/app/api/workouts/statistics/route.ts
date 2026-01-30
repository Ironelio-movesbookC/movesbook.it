import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/workouts/statistics - Get workout completion statistics
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const sport = searchParams.get('sport');

    // Build where clause
    const whereClause: any = {
      workoutDay: {
        workoutWeek: {
          workoutPlan: {
            userId: decoded.userId
          }
        }
      }
    };

    // Add date filters if provided
    if (startDate || endDate) {
      whereClause.workoutDay.date = {};
      if (startDate) whereClause.workoutDay.date.gte = new Date(startDate);
      if (endDate) whereClause.workoutDay.date.lte = new Date(endDate);
    }

    // Fetch all workout sessions
    const sessions = await prisma.workoutSession.findMany({
      where: whereClause,
      include: {
        workoutDay: {
          include: {
            workoutWeek: true
          }
        },
        moveframes: {
          include: {
            movelaps: true
          }
        }
      }
    });

    // Calculate statistics
    const stats = {
      total: sessions.length,
      planned: 0,
      done: 0,
      doneDifferently: 0,
      doneUnder75: 0,
      doneOver75: 0,
      notPlanned: 0,
      completionRate: 0,
      bySport: {} as any,
      byWeek: {} as any,
      totalDistance: 0,
      totalDuration: 0,
      avgHeartRate: 0,
      totalCalories: 0
    };

    let heartRateSum = 0;
    let heartRateCount = 0;

    sessions.forEach(session => {
      // Count by status
      switch (session.status) {
        case 'NOT_PLANNED':
          stats.notPlanned++;
          break;
        case 'PLANNED_FUTURE':
        case 'PLANNED_NEXT_WEEK':
        case 'PLANNED_CURRENT_WEEK':
          stats.planned++;
          break;
        case 'DONE_DIFFERENTLY':
          stats.done++;
          stats.doneDifferently++;
          break;
        case 'DONE_LESS_75':
          stats.done++;
          stats.doneUnder75++;
          break;
        case 'DONE_MORE_75':
          stats.done++;
          stats.doneOver75++;
          break;
      }

      // Calculate totals
      if (session.calories) stats.totalCalories += session.calories;
      if (session.heartRateAvg) {
        heartRateSum += session.heartRateAvg;
        heartRateCount++;
      }

      // Calculate distance by sport
      session.moveframes.forEach(mf => {
        const sportKey = mf.sport.toLowerCase();
        if (!stats.bySport[sportKey]) {
          stats.bySport[sportKey] = {
            total: 0,
            done: 0,
            totalDistance: 0
          };
        }
        stats.bySport[sportKey].total++;
        if (session.status.startsWith('DONE')) {
          stats.bySport[sportKey].done++;
        }

        // Sum distance from movelaps
        mf.movelaps.forEach(lap => {
          if (lap.distance) {
            stats.totalDistance += lap.distance;
            stats.bySport[sportKey].totalDistance += lap.distance;
          }
        });
      });

      // Count by week
      const weekKey = `W${session.workoutDay.weekNumber}`;
      if (!stats.byWeek[weekKey]) {
        stats.byWeek[weekKey] = {
          total: 0,
          done: 0,
          planned: 0
        };
      }
      stats.byWeek[weekKey].total++;
      if (session.status.startsWith('DONE')) {
        stats.byWeek[weekKey].done++;
      } else if (session.status.startsWith('PLANNED')) {
        stats.byWeek[weekKey].planned++;
      }
    });

    // Calculate completion rate
    const totalPlannedOrDone = stats.planned + stats.done;
    if (totalPlannedOrDone > 0) {
      stats.completionRate = Math.round((stats.done / totalPlannedOrDone) * 100);
    }

    // Calculate average heart rate
    if (heartRateCount > 0) {
      stats.avgHeartRate = Math.round(heartRateSum / heartRateCount);
    }

    return NextResponse.json({ statistics: stats });
  } catch (error) {
    console.error('Error fetching workout statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workout statistics' },
      { status: 500 }
    );
  }
}

