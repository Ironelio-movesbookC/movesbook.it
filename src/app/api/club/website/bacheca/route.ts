import { NextRequest, NextResponse } from 'next/server';
import {
  getBachecaManageAccess,
  getBachecaReadAccess,
} from '@/lib/clubBachecaReadAccess';
import {
  loadClubBachecaLabels,
  upsertClubBachecaLabel,
} from '@/lib/clubBachecaPersistence';
import {
  filterBachecaLabelsForMembers,
  type BachecaLabel,
} from '@/lib/clubBachecaLabels';

export const dynamic = 'force-dynamic';

function parseLabelBody(
  body: unknown,
): Pick<BachecaLabel, 'id' | 'name' | 'activated' | 'content' | 'updatedOn'> | null {
  if (!body || typeof body !== 'object') return null;
  const data = body as Record<string, unknown>;
  if (typeof data.id !== 'string' || !data.id.trim()) return null;
  if (typeof data.name !== 'string') return null;
  if (typeof data.activated !== 'boolean') return null;
  if (typeof data.content !== 'string') return null;
  return {
    id: data.id.trim(),
    name: data.name,
    activated: data.activated,
    content: data.content,
    updatedOn: typeof data.updatedOn === 'string' ? data.updatedOn : '',
  };
}

export async function GET(request: NextRequest) {
  const memberView = request.nextUrl.searchParams.get('memberView') === '1';
  const requestedClubId = request.nextUrl.searchParams.get('clubId');

  try {
    if (memberView) {
      const access = await getBachecaReadAccess(request, requestedClubId);
      if (!access.ok) return access.error;

      const labels = await loadClubBachecaLabels(access.clubId);
      return NextResponse.json({
        labels: filterBachecaLabelsForMembers(labels),
        clubId: access.clubId,
      });
    }

    const access = await getBachecaManageAccess(request, requestedClubId);
    if (!access.ok) return access.error;

    const labels = await loadClubBachecaLabels(access.clubId);
    return NextResponse.json({ labels, clubId: access.clubId });
  } catch (error) {
    console.error('GET /api/club/website/bacheca', error);
    return NextResponse.json({ error: 'Failed to load bacheca labels' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const requestedClubId = request.nextUrl.searchParams.get('clubId');
  const access = await getBachecaManageAccess(request, requestedClubId);
  if (!access.ok) return access.error;

  try {
    const body = await request.json();
    const label = parseLabelBody(body);
    if (!label) {
      return NextResponse.json({ error: 'Invalid bacheca label payload' }, { status: 400 });
    }

    const saved = await upsertClubBachecaLabel(access.clubId, label);
    return NextResponse.json({ label: saved, clubId: access.clubId });
  } catch (error) {
    console.error('PUT /api/club/website/bacheca', error);
    const message = error instanceof Error ? error.message : 'Failed to save bacheca label';
    const status = message === 'Label name is required' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
