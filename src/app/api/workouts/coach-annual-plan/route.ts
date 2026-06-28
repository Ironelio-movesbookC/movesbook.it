import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  extractCoachWeekFromPayload,
  parseAuthorizedWeekNumbers,
} from '@/lib/coachAnnualPlanPayload';

export const dynamic = 'force-dynamic';

/** GET — Coach annual plan import options for the logged-in athlete. */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authorization required' }, { status: 401 });
    }

    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const anchorWeekNumber = Math.max(1, parseInt(searchParams.get('anchorWeekNumber') ?? '1', 10) || 1);
    const maxWeekNumber = Math.max(anchorWeekNumber, parseInt(searchParams.get('maxWeekNumber') ?? '52', 10) || 52);

    const coachLinks = await prisma.coachAthlete.findMany({
      where: { athleteId: decoded.userId },
      include: {
        coach: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (coachLinks.length === 0) {
      return NextResponse.json({
        plan: null,
        authorizedWeekNumbers: [],
        message: 'No coach linked to your account.',
      });
    }

    const coachIds = coachLinks.map((l) => l.coachId);

    const entries = await prisma.globalWorkoutArchiveEntry.findMany({
      where: {
        disabled: false,
        recordType: 'COACH_PLAN',
        sharedByUserId: { in: coachIds },
      },
      orderBy: [{ sharedAt: 'desc' }, { createdAt: 'desc' }],
    });

    if (entries.length === 0) {
      const primaryCoach = coachLinks[0].coach;
      return NextResponse.json({
        plan: {
          entryId: null,
          title: "Your Coach's Annual Plan",
          coach: {
            id: primaryCoach.id,
            name: primaryCoach.name || primaryCoach.username || 'Coach',
            avatarUrl: primaryCoach.image ?? null,
          },
        },
        authorizedWeekNumbers: [],
        message: 'Your coach has not shared an annual plan yet.',
      });
    }

    const entry = entries[0];
    const coachLink =
      coachLinks.find((l) => l.coachId === entry.sharedByUserId) ?? coachLinks[0];
    const coach = coachLink.coach;

    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(entry.payloadData) as Record<string, unknown>;
    } catch {
      payload = {};
    }

    const authorizedWeekNumbers = parseAuthorizedWeekNumbers(
      payload,
      anchorWeekNumber,
      maxWeekNumber
    );

    const plan = {
      entryId: entry.id,
      title: entry.title,
      coach: {
        id: coach.id,
        name: coach.name || coach.username || entry.authorFullName || 'Coach',
        avatarUrl: coach.image ?? entry.authorAvatarUrl ?? null,
      },
    };

    const weekNumberParam = searchParams.get('weekNumber');
    if (weekNumberParam) {
      const weekNumber = parseInt(weekNumberParam, 10);
      if (!Number.isFinite(weekNumber) || weekNumber < 1) {
        return NextResponse.json({ error: 'Invalid weekNumber' }, { status: 400 });
      }
      if (!authorizedWeekNumbers.includes(weekNumber)) {
        return NextResponse.json({ error: 'Week not authorized for import' }, { status: 403 });
      }
      const coachWeek = extractCoachWeekFromPayload(payload, weekNumber);
      return NextResponse.json({
        plan,
        authorizedWeekNumbers,
        coachWeek,
      });
    }

    return NextResponse.json({
      plan,
      authorizedWeekNumbers,
    });
  } catch (error) {
    console.error('GET coach-annual-plan:', error);
    return NextResponse.json({ error: 'Failed to load coach annual plan' }, { status: 500 });
  }
}
