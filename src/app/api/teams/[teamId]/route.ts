import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { findEntityIdByCompanyUsername } from '@/lib/entity/patchEntityProfile';
import { mergeTeamDescriptionForSave } from '@/lib/team/teamProfilePayload';
import type { TeamProfileFormPayload } from '@/lib/team/teamProfileTypes';
import { hashClubCompanyPassword } from '@/lib/club/clubDirectLogin';

export const dynamic = 'force-dynamic';

function isTeamProfilePatch(body: Record<string, unknown>): boolean {
  return [
    'sport',
    'username',
    'officialName',
    'directAccess',
    'directRegistrationCode',
    'teamPassword',
    'mainData',
    'legalSite',
    'contacts',
    'federal',
    'adminSport',
  ].some((k) => k in body);
}

async function assertTeamOwner(teamId: string, userId: string): Promise<boolean> {
  const team = await prisma.team.findFirst({
    where: { id: teamId, adminId: userId },
    select: { id: true },
  });
  return Boolean(team);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { teamId: string } },
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
    const teamId = params.teamId;
    const body = (await request.json()) as Record<string, unknown>;

    if (!(await assertTeamOwner(teamId, userId))) {
      return NextResponse.json(
        { error: 'Team not found or access denied' },
        { status: 404 },
      );
    }

    if (!isTeamProfilePatch(body)) {
      return NextResponse.json({ error: 'No profile fields to update' }, { status: 400 });
    }

    const payload = body as unknown as TeamProfileFormPayload;
    const teamUsername = String(payload.username ?? '').trim();
    const teamDirectAccess = String(payload.directAccess ?? '').trim();
    if (!teamUsername || !teamDirectAccess) {
      return NextResponse.json(
        { error: 'Team username and Direct Access are required' },
        { status: 400 },
      );
    }

    const existingTeams = await prisma.team.findMany({
      where: { description: { not: null } },
      select: { id: true, description: true },
    });
    const duplicateId = findEntityIdByCompanyUsername(existingTeams, teamUsername);
    if (duplicateId && duplicateId !== teamId) {
      return NextResponse.json(
        { error: 'This team username is already in use' },
        { status: 409 },
      );
    }

    const current = await prisma.team.findUnique({
      where: { id: teamId },
      select: { description: true },
    });
    if (!current) {
      return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    }

    let clubPasswordHash: string | undefined;
    const newPassword = String(payload.teamPassword ?? '').trim();
    if (newPassword) {
      clubPasswordHash = await hashClubCompanyPassword(newPassword);
    }

    const teamName =
      String(payload.officialName ?? '').trim() || teamUsername || 'Team';
    const sport = String(payload.sport ?? '').trim() || null;
    const description = mergeTeamDescriptionForSave(current.description, payload, {
      clubPasswordHash,
    });

    const updated = await prisma.team.update({
      where: { id: teamId },
      data: {
        name: teamName,
        description,
        sport,
      },
      select: {
        id: true,
        name: true,
        description: true,
        sport: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ team: updated });
  } catch (e) {
    console.error('PATCH /api/teams/[teamId]:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
