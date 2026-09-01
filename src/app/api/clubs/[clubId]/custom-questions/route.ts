import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';
import type { CustomQuestionDef } from '@/lib/club/memberProfileTypes';

export const dynamic = 'force-dynamic';

function getUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  return verifyToken(token)?.userId ?? null;
}

function normalizeQuestions(raw: unknown): CustomQuestionDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((q, i) => {
      if (!q || typeof q !== 'object') return null;
      const o = q as Record<string, unknown>;
      const question = String(o.question || '').trim();
      if (!question) return null;
      const answerType = o.answerType;
      return {
        id: String(o.id || `cq-${Date.now()}-${i}`),
        question,
        answerType:
          answerType === 'checkbox' ||
          answerType === 'yes_no' ||
          answerType === 'list' ||
          answerType === 'free'
            ? answerType
            : 'free',
        visibleInRegistration: Boolean(o.visibleInRegistration),
        mandatory: Boolean(o.mandatory),
        listOptions: String(o.listOptions || ''),
      } satisfies CustomQuestionDef;
    })
    .filter((q): q is CustomQuestionDef => Boolean(q));
}

async function assertClubAdmin(userId: string, clubId: string) {
  const club = await prisma.club.findUnique({
    where: { id: clubId },
    select: { id: true, adminId: true, description: true, name: true },
  });
  if (!club) return { error: 'Club not found', status: 404 as const };
  if (club.adminId !== userId) return { error: 'Forbidden', status: 403 as const };
  return { club };
}

export async function GET(
  request: NextRequest,
  { params }: { params: { clubId: string } },
) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const club = await prisma.club.findUnique({
    where: { id: params.clubId },
    select: { id: true, adminId: true, description: true, name: true },
  });
  if (!club) return NextResponse.json({ error: 'Club not found' }, { status: 404 });

  const meta = parseClubDescriptionMeta(club.description);
  return NextResponse.json({
    clubName: club.name,
    canEdit: club.adminId === userId,
    questions: normalizeQuestions(meta.customQuestions),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { clubId: string } },
) {
  const userId = getUserId(request);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const auth = await assertClubAdmin(userId, params.clubId);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const questions = normalizeQuestions(
    (body as { questions?: unknown })?.questions,
  ).slice(0, 10);

  const meta = parseClubDescriptionMeta(auth.club.description);
  const nextMeta = { ...meta, customQuestions: questions };
  await prisma.club.update({
    where: { id: params.clubId },
    data: { description: JSON.stringify(nextMeta) },
  });

  return NextResponse.json({ success: true, questions });
}
