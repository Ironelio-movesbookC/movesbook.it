import { NextRequest, NextResponse } from 'next/server';
import { getAuthorizedContext } from '@/lib/clubCardReadersApi';
import {
  loadClubBachecaLabels,
  upsertClubBachecaLabel,
} from '@/lib/clubBachecaPersistence';
import type { BachecaLabel } from '@/lib/clubBachecaLabels';

export const dynamic = 'force-dynamic';

function parseLabelBody(body: unknown): Pick<BachecaLabel, 'id' | 'name' | 'activated' | 'content'> | null {
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
  };
}

export async function GET(request: NextRequest) {
  const context = await getAuthorizedContext(request);
  if ('error' in context) return context.error;

  if (!context.club?.id) {
    return NextResponse.json({ error: 'No club found for this account' }, { status: 404 });
  }

  try {
    const labels = await loadClubBachecaLabels(context.club.id);
    return NextResponse.json({ labels, clubId: context.club.id });
  } catch (error) {
    console.error('GET /api/club/website/bacheca', error);
    return NextResponse.json({ error: 'Failed to load bacheca labels' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const context = await getAuthorizedContext(request);
  if ('error' in context) return context.error;

  if (!context.club?.id) {
    return NextResponse.json({ error: 'No club found for this account' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const label = parseLabelBody(body);
    if (!label) {
      return NextResponse.json({ error: 'Invalid bacheca label payload' }, { status: 400 });
    }

    const saved = await upsertClubBachecaLabel(context.club.id, label);
    return NextResponse.json({ label: saved, clubId: context.club.id });
  } catch (error) {
    console.error('PUT /api/club/website/bacheca', error);
    const message = error instanceof Error ? error.message : 'Failed to save bacheca label';
    const status = message === 'Label name is required' ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
