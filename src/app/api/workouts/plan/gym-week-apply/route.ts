import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import type { GymWeekWeekAssignment } from '@/types/gymWeekAssignment';
import type { GoalId } from '@/components/workouts/modals/PlanGymWeekModal';
import {
  buildGymWeekMoveframesForRoutineDay,
  GYM_WEEK_MOVEFRAME_MARKER,
  routineLabel,
  type GymWeekMoveframePayload,
} from '@/utils/gymWeekPlanToMoveframes';

function indexToLetter(index: number): string {
  let result = '';
  let i = index;
  while (i >= 0) {
    result = String.fromCharCode(65 + (i % 26)) + result;
    i = Math.floor(i / 26) - 1;
  }
  return result;
}

type ApplyBody = {
  assignments: GymWeekWeekAssignment[];
  goals?: GoalId[];
};

async function getDefaultSectionId(userId: string): Promise<string> {
  let section = await prisma.workoutSection.findFirst({
    where: { userId, name: 'Default' },
    orderBy: { createdAt: 'asc' },
  });
  if (!section) {
    section = await prisma.workoutSection.create({
      data: {
        userId,
        name: 'Default',
        description: 'Default workout section',
        color: '#3b82f6',
      },
    });
  }
  return section.id;
}

async function verifyWeekAccess(weekId: string, dbUserId: string) {
  const week = await prisma.workoutWeek.findUnique({
    where: { id: weekId },
    include: {
      workoutPlan: { select: { userId: true, type: true } },
      days: { select: { id: true, dayOfWeek: true, userId: true } },
    },
  });
  if (!week) return null;
  if (week.workoutPlan.userId !== dbUserId) return null;
  return week;
}

async function removeGymWeekMoveframesFromSession(sessionId: string) {
  const moveframes = await prisma.moveframe.findMany({
    where: { workoutSessionId: sessionId },
    select: { id: true, notes: true },
  });
  const gymIds = moveframes.filter((mf) => mf.notes?.includes(GYM_WEEK_MOVEFRAME_MARKER)).map((mf) => mf.id);
  if (!gymIds.length) return;
  await prisma.movelap.deleteMany({ where: { moveframeId: { in: gymIds } } });
  await prisma.moveframe.deleteMany({ where: { id: { in: gymIds } } });
}

async function createMoveframeWithMovelaps(
  sessionId: string,
  sectionId: string,
  payload: GymWeekMoveframePayload,
  letterIndex: number,
) {
  const moveframe = await prisma.moveframe.create({
    data: {
      workoutSessionId: sessionId,
      sectionId,
      letter: indexToLetter(letterIndex),
      sport: payload.sport,
      type: payload.type,
      description: payload.description,
      notes: payload.notes,
      macroFinal: payload.macroFinal,
      repetitions: payload.movelaps.length,
      manualMode: false,
      manualPriority: false,
      manualInputType: 'meters',
    },
  });

  if (payload.movelaps.length > 0) {
    await prisma.movelap.createMany({
      data: payload.movelaps.map((lap) => ({
        moveframeId: moveframe.id,
        repetitionNumber: lap.repetitionNumber,
        distance: lap.distance,
        speed: lap.speed,
        style: lap.style,
        pace: lap.pace,
        time: lap.time,
        reps: lap.reps,
        weight: lap.weight,
        tools: lap.tools,
        r1: lap.r1,
        r2: lap.r2,
        muscularSector: lap.muscularSector,
        exercise: lap.exercise,
        restType: lap.restType,
        pause: lap.pause,
        macroFinal: lap.macroFinal,
        alarm: lap.alarm,
        sound: lap.sound,
        notes: lap.notes,
        status: lap.status,
        isSkipped: lap.isSkipped,
        isDisabled: lap.isDisabled,
      })),
    });
  }

  return moveframe;
}

async function ensureWorkoutSession(params: {
  dayId: string;
  sessionNumber: number;
  name: string;
  goal?: GoalId;
}) {
  const existing = await prisma.workoutSession.findFirst({
    where: {
      workoutDayId: params.dayId,
      sessionNumber: params.sessionNumber,
    },
  });
  if (existing) return existing;

  const count = await prisma.workoutSession.count({ where: { workoutDayId: params.dayId } });
  if (count >= 3) {
    throw new Error(`Maximum 3 workouts per day (WO ${params.sessionNumber})`);
  }

  return prisma.workoutSession.create({
    data: {
      workoutDayId: params.dayId,
      sessionNumber: params.sessionNumber,
      name: params.name,
      code: '',
      time: '',
      notes: '',
      status: 'PLANNED_FUTURE',
      mainSport: 'BODY_BUILDING',
      mainGoal: params.goal ?? null,
      intensity: 'Medium',
    },
  });
}

async function applyAssignmentToWeek(
  assignment: GymWeekWeekAssignment,
  goals: GoalId[],
  dbUserId: string,
  defaultSectionId: string,
) {
  const week = await verifyWeekAccess(assignment.weekId, dbUserId);
  if (!week) {
    throw new Error(`Week not found or access denied (${assignment.weekId})`);
  }

  const dayByDow = new Map(week.days.map((d) => [d.dayOfWeek, d]));
  const trainingLevel = assignment.plan.trainingLevel ?? null;

  const allSessions = await prisma.workoutSession.findMany({
    where: { workoutDayId: { in: week.days.map((d) => d.id) } },
    select: { id: true },
  });
  for (const session of allSessions) {
    await removeGymWeekMoveframesFromSession(session.id);
  }

  const sessionsTouched = new Set<string>();

  for (const slot of assignment.slots ?? []) {
    const day = dayByDow.get(slot.dayOfWeek);
    if (!day) {
      throw new Error(`Day ${slot.dayOfWeek} not found in week ${assignment.weekNumber ?? assignment.weekId}`);
    }

    const routineDay = assignment.plan.days[slot.routineDayIndex];
    if (!routineDay) {
      throw new Error(`Routine day ${slot.routineDayIndex + 1} not found in plan`);
    }

    const goalId = goals[slot.routineDayIndex] ?? goals[0];
    const session = await ensureWorkoutSession({
      dayId: day.id,
      sessionNumber: slot.workoutIndex,
      name: routineLabel(routineDay, slot.routineDayIndex),
      goal: goalId,
    });

    const existingCount = await prisma.moveframe.count({ where: { workoutSessionId: session.id } });
    const payloads = buildGymWeekMoveframesForRoutineDay(
      routineDay,
      slot.routineDayIndex,
      goalId,
      trainingLevel,
    );

    for (let i = 0; i < payloads.length; i++) {
      await createMoveframeWithMovelaps(session.id, defaultSectionId, payloads[i], existingCount + i);
    }

    sessionsTouched.add(session.id);
  }

  const assignmentPayload = JSON.stringify({
    type: 'gym_week_assignment',
    plan: assignment.plan,
    slots: assignment.slots,
    goals,
    sourceSection: assignment.sourceSection,
    templateKey: assignment.templateKey,
    updatedAt: new Date().toISOString(),
  });

  await prisma.workoutWeek.update({
    where: { id: assignment.weekId },
    data: { notes: assignmentPayload },
  });

  return {
    weekId: assignment.weekId,
    weekNumber: week.weekNumber,
    sessionsUpdated: sessionsTouched.size,
    moveframesCreated: assignment.slots.reduce((sum, slot) => {
      const routineDay = assignment.plan.days[slot.routineDayIndex];
      if (!routineDay) return sum;
      return (
        sum +
        buildGymWeekMoveframesForRoutineDay(
          routineDay,
          slot.routineDayIndex,
          goals[slot.routineDayIndex] ?? goals[0],
          trainingLevel,
        ).length
      );
    }, 0),
  };
}

/** POST /api/workouts/plan/gym-week-apply — persist gym week routines as Fast Planner moveframes. */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = (await request.json()) as ApplyBody;
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];
    const goals = Array.isArray(body?.goals) ? body.goals : [];

    if (!assignments.length) {
      return NextResponse.json({ error: 'No week assignments provided' }, { status: 400 });
    }

    for (const a of assignments) {
      if (!a.weekId || !a.plan?.days?.length || !a.slots?.length) {
        return NextResponse.json({ error: 'Invalid assignment payload' }, { status: 400 });
      }
    }

    const defaultSectionId = await getDefaultSectionId(dbUserId);
    const results = [];

    for (const assignment of assignments) {
      results.push(await applyAssignmentToWeek(assignment, goals, dbUserId, defaultSectionId));
    }

    return NextResponse.json({ success: true, results });
  } catch (error: unknown) {
    console.error('Error applying gym week plan:', error);
    return NextResponse.json(
      {
        error: 'Failed to save gym week plan',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 },
    );
  }
}

/** DELETE /api/workouts/plan/gym-week-apply?weekId= — remove gym week moveframes from a week. */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const weekId = request.nextUrl.searchParams.get('weekId');
    if (!weekId) {
      return NextResponse.json({ error: 'weekId is required' }, { status: 400 });
    }

    const week = await verifyWeekAccess(weekId, dbUserId);
    if (!week) {
      return NextResponse.json({ error: 'Week not found' }, { status: 404 });
    }

    const sessions = await prisma.workoutSession.findMany({
      where: { workoutDayId: { in: week.days.map((d) => d.id) } },
      select: { id: true },
    });

    for (const session of sessions) {
      await removeGymWeekMoveframesFromSession(session.id);
    }

    await prisma.workoutWeek.update({
      where: { id: weekId },
      data: { notes: null },
    });

    return NextResponse.json({ success: true, weekId });
  } catch (error: unknown) {
    console.error('Error removing gym week plan:', error);
    return NextResponse.json(
      {
        error: 'Failed to remove gym week plan',
        details: error instanceof Error ? error.message : 'Unknown',
      },
      { status: 500 },
    );
  }
}
