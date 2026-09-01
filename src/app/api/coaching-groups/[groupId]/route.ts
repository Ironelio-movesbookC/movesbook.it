import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import type { ClubProfileFormPayload } from '@/lib/club/clubProfilePayload';
import {
  findEntityIdByCompanyUsername,
  isEntityProfilePatch,
  mergeEntityProfileDescriptionForPatch,
} from '@/lib/entity/patchEntityProfile';

export const dynamic = 'force-dynamic';

async function assertCoachingGroupOwner(groupId: string, userId: string): Promise<boolean> {
  const group = await prisma.coachingGroup.findFirst({
    where: { id: groupId, coachId: userId },
    select: { id: true },
  });
  return Boolean(group);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { groupId: string } },
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId as string;
    const groupId = params.groupId;
    const body = (await request.json()) as Record<string, unknown>;

    if (!(await assertCoachingGroupOwner(groupId, userId))) {
      return NextResponse.json(
        { error: 'Coaching group not found or access denied' },
        { status: 404 },
      );
    }

    if (!isEntityProfilePatch(body)) {
      return NextResponse.json({ error: 'No profile fields to update' }, { status: 400 });
    }

    const payload = body as unknown as ClubProfileFormPayload;
    const groupUsername = String(payload.username ?? '').trim();
    const groupDirectAccess = String(payload.directAccess ?? '').trim();
    if (!groupUsername || !groupDirectAccess) {
      return NextResponse.json(
        { error: 'Group username and Direct Access are required' },
        { status: 400 },
      );
    }

    const existingGroups = await prisma.coachingGroup.findMany({
      where: { description: { not: null } },
      select: { id: true, description: true },
    });
    const duplicateId = findEntityIdByCompanyUsername(existingGroups, groupUsername);
    if (duplicateId && duplicateId !== groupId) {
      return NextResponse.json(
        { error: 'This group username is already in use' },
        { status: 409 },
      );
    }

    const current = await prisma.coachingGroup.findUnique({
      where: { id: groupId },
      select: { description: true },
    });
    if (!current) {
      return NextResponse.json({ error: 'Coaching group not found' }, { status: 404 });
    }

    const groupName =
      String(payload.officialName ?? '').trim() || groupUsername || 'Group';
    const { description } = await mergeEntityProfileDescriptionForPatch(
      current.description,
      {
        ...payload,
        username: groupUsername,
        directAccess: groupDirectAccess,
        officialName: groupName,
      },
    );

    const updated = await prisma.coachingGroup.update({
      where: { id: groupId },
      data: {
        name: groupName,
        description,
      },
      select: {
        id: true,
        name: true,
        description: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ coachingGroup: updated });
  } catch (e) {
    console.error('PATCH /api/coaching-groups/[groupId]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
