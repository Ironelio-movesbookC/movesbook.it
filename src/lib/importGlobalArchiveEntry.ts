import type { PrismaClient } from '@prisma/client';
import type { GlobalWorkoutArchiveEntry } from '@prisma/client';
import { normalizePeriodizationTemplates, type PeriodizationTemplate } from '@/constants/tools.constants';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>;

function getMondayOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

async function getDefaultSectionId(tx: Tx, userId: string): Promise<string> {
  let section = await tx.workoutSection.findFirst({
    where: { userId, name: 'Default' },
  });
  if (!section) {
    section = await tx.workoutSection.create({
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

async function resolveMoveframeSectionId(
  tx: Tx,
  userId: string,
  moveframe: Record<string, unknown>,
  defaultSectionId: string
): Promise<string> {
  const rawId = moveframe.sectionId as string | undefined;
  if (rawId) {
    const exists = await tx.workoutSection.findFirst({
      where: { id: rawId, userId },
      select: { id: true },
    });
    if (exists) return exists.id;
  }
  const embedded = moveframe.section as { id?: string } | undefined;
  if (embedded?.id) {
    const exists = await tx.workoutSection.findFirst({
      where: { id: embedded.id, userId },
      select: { id: true },
    });
    if (exists) return exists.id;
  }
  return defaultSectionId;
}

async function createWorkoutOnDay(
  tx: Tx,
  userId: string,
  targetDayId: string,
  workoutPayload: Record<string, unknown>,
  sports: Array<{ sport?: string }>,
  moveframes: Array<Record<string, unknown>>,
  entry: GlobalWorkoutArchiveEntry,
  sessionNumber?: number
) {
  const existing = await tx.workoutSession.findMany({
    where: { workoutDayId: targetDayId },
    select: { sessionNumber: true },
  });
  if (existing.length >= 3) {
    throw new Error('Target day already has 3 workouts. Choose another day.');
  }

  const nextSession =
    sessionNumber ??
    (existing.length > 0 ? Math.max(...existing.map((w) => w.sessionNumber)) + 1 : 1);

  const defaultSectionId = await getDefaultSectionId(tx, userId);
  const w = workoutPayload;

  const newWorkout = await tx.workoutSession.create({
    data: {
      workoutDayId: targetDayId,
      sessionNumber: nextSession,
      name: String(w.name || entry.title || 'Imported workout'),
      code: String(w.code || entry.id.slice(-6).toUpperCase()),
      time: String(w.time || ''),
      weather: (w.weather as string) || null,
      location: (w.location as string) || null,
      surface: (w.surface as string) || null,
      heartRateMax: (w.heartRateMax as number) ?? null,
      heartRateAvg: (w.heartRateAvg as number) ?? null,
      calories: (w.calories as number) ?? null,
      feelingStatus: (w.feelingStatus as string) || null,
      notes: `${(w.notes as string) || ''}${entry.shortDescription ? `\n${entry.shortDescription}` : ''}`.trim() || `Imported from global archive`,
      status: 'NOT_PLANNED',
      mainSport: (entry.mainSport as any) ?? null,
      mainGoal: entry.mainGoal,
      intensity: entry.trainingLevel,
      tags: entry.tags,
    },
  });

  for (const sportRow of sports) {
    if (!sportRow?.sport) continue;
    await tx.workoutSessionSport.create({
      data: { workoutSessionId: newWorkout.id, sport: sportRow.sport as any },
    });
  }

  for (const mf of moveframes) {
    const sectionId = await resolveMoveframeSectionId(tx, userId, mf, defaultSectionId);
    const movelaps = Array.isArray(mf.movelaps) ? mf.movelaps : [];
    const newMf = await tx.moveframe.create({
      data: {
        workoutSessionId: newWorkout.id,
        sectionId,
        letter: String(mf.letter || 'A'),
        sport: (mf.sport as any) || (entry.mainSport as any) || 'RUN',
        type: (mf.type as any) || 'MAIN',
        description: String(mf.description || ''),
        notes: (mf.notes as string) || null,
        macroFinal: (mf.macroFinal as string) || null,
        alarm: (mf.alarm as number) ?? null,
        annotationText: (mf.annotationText as string) || null,
        annotationBgColor: (mf.annotationBgColor as string) || null,
        annotationTextColor: (mf.annotationTextColor as string) || null,
        annotationBold: (mf.annotationBold as boolean) ?? false,
        workType: (mf.workType as any) || 'NONE',
        manualMode: (mf.manualMode as boolean) ?? false,
        favourite: (mf.favourite as boolean) ?? false,
      },
    });

    for (const lap of movelaps) {
      const ml = lap as Record<string, unknown>;
      await tx.movelap.create({
        data: {
          moveframeId: newMf.id,
          repetitionNumber: (ml.repetitionNumber as number) ?? 1,
          distance: (ml.distance as number) ?? null,
          time: (ml.time as string) || null,
          speed: (ml.speed as string) || null,
          style: (ml.style as string) || null,
          pace: (ml.pace as string) || null,
          reps: (ml.reps as number) ?? null,
          restType: (ml.restType as any) || null,
          pause: (ml.pause as string) || null,
          alarm: (ml.alarm as number) ?? null,
          sound: (ml.sound as string) || null,
          notes: (ml.notes as string) || null,
          status: 'PENDING',
          isSkipped: false,
          isDisabled: false,
        },
      });
    }
  }

  return newWorkout;
}

async function ensureArchivePlan(tx: Tx, userId: string) {
  let plan = await tx.workoutPlan.findFirst({
    where: { userId, type: 'ARCHIVE' },
    include: {
      weeks: { select: { id: true, weekNumber: true }, orderBy: { weekNumber: 'desc' }, take: 1 },
    },
  });

  if (!plan) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(today);
    startDate.setFullYear(startDate.getFullYear() - 2);
    const endDate = new Date(today);
    endDate.setFullYear(endDate.getFullYear() + 1);
    plan = await tx.workoutPlan.create({
      data: {
        userId,
        name: 'Archive',
        type: 'ARCHIVE',
        startDate,
        endDate,
      },
      include: {
        weeks: { select: { id: true, weekNumber: true } },
      },
    });
  }
  return plan;
}

async function createArchiveWeekWithDays(tx: Tx, userId: string, planId: string, notes?: string) {
  const plan = await tx.workoutPlan.findUnique({
    where: { id: planId },
    include: {
      weeks: { select: { weekNumber: true }, orderBy: { weekNumber: 'desc' }, take: 1 },
    },
  });
  const nextWeekNumber = (plan?.weeks[0]?.weekNumber ?? 0) + 1;

  const latestArchiveDay = await tx.workoutDay.findFirst({
    where: { userId, storageZone: 'D' },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  const weekStartDate = latestArchiveDay
    ? (() => {
        const next = getMondayOfWeek(new Date(latestArchiveDay.date));
        next.setDate(next.getDate() + 7);
        return next;
      })()
    : getMondayOfWeek(new Date());

  let defaultPeriod = await tx.period.findFirst({ where: { userId } });
  if (!defaultPeriod) {
    defaultPeriod = await tx.period.create({
      data: {
        userId,
        name: 'Base Period',
        description: 'Default training period',
        color: '#3b82f6',
      },
    });
  }

  const week = await tx.workoutWeek.create({
    data: {
      workoutPlanId: planId,
      weekNumber: nextWeekNumber,
      notes: notes || null,
    },
  });

  const days = [];
  for (let dayOfWeek = 1; dayOfWeek <= 7; dayOfWeek++) {
    const dayDate = new Date(weekStartDate);
    dayDate.setDate(weekStartDate.getDate() + (dayOfWeek - 1));
    const day = await tx.workoutDay.create({
      data: {
        userId,
        workoutWeekId: week.id,
        dayOfWeek,
        weekNumber: nextWeekNumber,
        date: dayDate,
        periodId: defaultPeriod.id,
        storageZone: 'D',
        weather: '',
        feelingStatus: '5',
        notes: '',
      },
    });
    days.push(day);
  }

  return { week, days };
}

async function pickTargetArchiveDay(
  tx: Tx,
  userId: string,
  targetWeekId?: string,
  targetDayId?: string
) {
  if (targetDayId) {
    const day = await tx.workoutDay.findFirst({
      where: {
        id: targetDayId,
        userId,
        storageZone: 'D',
      },
      include: { workouts: { select: { id: true } } },
    });
    if (!day) throw new Error('Target archive day not found');
    if (day.workouts.length >= 3) throw new Error('Target day is full (max 3 workouts)');
    return day;
  }

  if (targetWeekId) {
    const week = await tx.workoutWeek.findFirst({
      where: { id: targetWeekId, workoutPlan: { userId, type: 'ARCHIVE' } },
      include: {
        days: {
          where: { storageZone: 'D' },
          include: { workouts: { select: { id: true } } },
          orderBy: { dayOfWeek: 'asc' },
        },
      },
    });
    if (!week) throw new Error('Target archive week not found');
    const slot = week.days.find((d) => d.workouts.length < 3);
    if (slot) return slot;
    throw new Error('All days in target week are full');
  }

  const plan = await ensureArchivePlan(tx, userId);
  const latestWeek = await tx.workoutWeek.findFirst({
    where: { workoutPlanId: plan.id },
    orderBy: { weekNumber: 'desc' },
    include: {
      days: {
        include: { workouts: { select: { id: true } } },
        orderBy: { dayOfWeek: 'asc' },
      },
    },
  });

  if (latestWeek) {
    const slot = latestWeek.days.find((d) => d.workouts.length < 3);
    if (slot) return slot;
  }

  const { days } = await createArchiveWeekWithDays(tx, userId, plan.id);
  return days[0];
}

async function importWeeklyPayloadToArchive(
  tx: Tx,
  userId: string,
  payload: Record<string, unknown>,
  entry: GlobalWorkoutArchiveEntry
) {
  const plan = await ensureArchivePlan(tx, userId);
  const weekNotes = [
    entry.title,
    entry.shortDescription,
    payload.notes as string,
  ]
    .filter(Boolean)
    .join(' — ');

  const { week, days } = await createArchiveWeekWithDays(
    tx,
    userId,
    plan.id,
    weekNotes.slice(0, 500)
  );

  const sourceDays = Array.isArray(payload.days)
    ? payload.days
    : Array.isArray(payload.weeks)
      ? (payload.weeks as Array<{ days?: unknown[] }>).flatMap((w) => w.days ?? [])
      : [];

  const dayByDow = new Map(days.map((d) => [d.dayOfWeek, d]));

  for (const sourceDay of sourceDays) {
    const sd = sourceDay as Record<string, unknown>;
    const dow = (sd.dayOfWeek as number) || 1;
    const targetDay = dayByDow.get(dow) ?? days[0];
    const workouts = Array.isArray(sd.workouts) ? sd.workouts : [];
    for (const workout of workouts) {
      const w = workout as Record<string, unknown>;
      const sports = Array.isArray(w.sports) ? w.sports : [];
      const moveframes = Array.isArray(w.moveframes) ? w.moveframes : [];
      await createWorkoutOnDay(
        tx,
        userId,
        targetDay.id,
        w,
        sports as Array<{ sport?: string }>,
        moveframes as Array<Record<string, unknown>>,
        entry,
        (w.sessionNumber as number) || undefined
      );
    }
  }

  return week;
}

async function importStructuredToUserSettings(
  tx: Tx,
  userId: string,
  payload: Record<string, unknown>,
  entry: GlobalWorkoutArchiveEntry
) {
  const settings = await tx.userSettings.findUnique({ where: { userId } });
  let toolsSettings: Record<string, unknown> = {};
  if (settings?.toolsSettings) {
    try {
      toolsSettings = JSON.parse(settings.toolsSettings) as Record<string, unknown>;
    } catch {
      toolsSettings = {};
    }
  }

  const existing = normalizePeriodizationTemplates(toolsSettings.periodizationTemplates);
  const template: PeriodizationTemplate = {
    id: `import-${entry.id.slice(0, 12)}-${Date.now()}`,
    name: String(payload.name || entry.title || 'Imported program'),
    sport: String(payload.sport || entry.mainSport || 'RUN'),
    level: String(payload.level || entry.trainingLevel || 'All levels'),
    language: String(payload.language || entry.originalLanguages?.split(',')[0] || 'en'),
    tags: entry.tags?.split(',').map((t) => t.trim()).filter(Boolean) || [],
    build:
      payload.build && typeof payload.build === 'object'
        ? (payload.build as PeriodizationTemplate['build'])
        : payload.weekPeriodByNumber
          ? { weekPeriodByNumber: payload.weekPeriodByNumber as Record<number, string> }
          : undefined,
    notes: entry.shortDescription || (payload.notes as string) || undefined,
    isUserCreated: true,
    createdAt: new Date().toISOString(),
  };

  toolsSettings.periodizationTemplates = [...existing, template];

  if (settings) {
    await tx.userSettings.update({
      where: { userId },
      data: { toolsSettings: JSON.stringify(toolsSettings) },
    });
  } else {
    await tx.userSettings.create({
      data: {
        userId,
        toolsSettings: JSON.stringify(toolsSettings),
        colorSettings: '{}',
        favouritesSettings: '{}',
        myBestSettings: '{}',
        workoutPreferences: '{}',
        adminSettings: '{}',
        socialSettings: '{}',
        notificationSettings: '{}',
        widgetArrangement: '[]',
      },
    });
  }

  return template;
}

export async function importGlobalArchiveEntry(
  prisma: PrismaClient,
  authUserId: string,
  globalEntryId: string,
  options?: { targetWeekId?: string; targetDayId?: string; sessionNumber?: number }
) {
  const dbUserId = await resolveWorkoutDatabaseUserId(authUserId);
  if (!dbUserId) throw new Error('User not found');

  const entry = await prisma.globalWorkoutArchiveEntry.findFirst({
    where: { id: globalEntryId, disabled: false },
  });
  if (!entry) throw new Error('Global archive entry not found or disabled');

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(entry.payloadData) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  return prisma.$transaction(async (tx) => {
    switch (entry.recordType) {
      case 'WORKOUT': {
        const targetDay = await pickTargetArchiveDay(
          tx,
          dbUserId,
          options?.targetWeekId,
          options?.targetDayId
        );
        const workoutPayload = (payload.workout as Record<string, unknown>) || payload;
        const sports = Array.isArray(payload.sports) ? payload.sports : [];
        const moveframes = Array.isArray(payload.moveframes) ? payload.moveframes : [];
        const workout = await createWorkoutOnDay(
          tx,
          dbUserId,
          targetDay.id,
          workoutPayload,
          sports as Array<{ sport?: string }>,
          moveframes as Array<Record<string, unknown>>,
          entry,
          options?.sessionNumber
        );
        return {
          kind: 'WORKOUT' as const,
          workoutId: workout.id,
          dayId: targetDay.id,
          message: `"${entry.title}" imported to your personal archive.`,
        };
      }
      case 'WEEKLY_PLAN':
      case 'COACH_PLAN': {
        const week = await importWeeklyPayloadToArchive(tx, dbUserId, payload, entry);
        return {
          kind: entry.recordType,
          weekId: week.id,
          message: `"${entry.title}" imported as archive week ${week.weekNumber}.`,
        };
      }
      case 'STRUCTURED_PROGRAM': {
        const template = await importStructuredToUserSettings(tx, dbUserId, payload, entry);
        return {
          kind: 'STRUCTURED_PROGRAM' as const,
          templateId: template.id,
          message: `Structured program "${template.name}" added to your periodization templates.`,
        };
      }
      default:
        throw new Error(`Unsupported record type: ${entry.recordType}`);
    }
  });
}
