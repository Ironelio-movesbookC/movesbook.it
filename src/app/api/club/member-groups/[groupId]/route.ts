import { NextRequest, NextResponse } from 'next/server';
import { getClubAuthContext } from '@/lib/procedures';
import {
  deleteClubMemberGroup,
  getClubMemberGroup,
  listClubMemberGroupMembers,
} from '@/lib/club/memberLists';
import type { ArchiveQueryParams } from '@/lib/club/archives/legacyArchiveQueries';

export const dynamic = 'force-dynamic';

type RouteContext = { params: { groupId: string } };

function parseArchiveParams(request: NextRequest): ArchiveQueryParams {
  const sp = request.nextUrl.searchParams;
  return {
    page: Number(sp.get('page') ?? 1),
    pageSize: Number(sp.get('pageSize') ?? 25),
    search: sp.get('search') ?? undefined,
    fromDate: sp.get('fromDate') ?? undefined,
    toDate: sp.get('toDate') ?? undefined,
    orderBy: (sp.get('orderBy') as 'recent' | 'old') ?? undefined,
    sport: sp.get('sport') ?? undefined,
    groupTrained: sp.get('groupTrained') ?? undefined,
  };
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const group = await getClubMemberGroup(auth.ctx, params.groupId);
    if (!group) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const members = await listClubMemberGroupMembers(
      auth.ctx,
      params.groupId,
      parseArchiveParams(request)
    );

    return NextResponse.json({ group, ...members });
  } catch (error) {
    console.error('GET club member group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const auth = await getClubAuthContext(request);
    if ('error' in auth) return auth.error;

    const deleted = await deleteClubMemberGroup(auth.ctx, params.groupId);
    if (!deleted) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE club member group:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
