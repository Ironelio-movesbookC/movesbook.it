import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser, getOrCreateUserForSuperAdmin } from '../../auth';

function parseJsonArray(value: unknown): string[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  if (typeof value === 'string') {
    try {
      const a = JSON.parse(value);
      return Array.isArray(a) ? a.filter((x: unknown): x is string => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

/** DELETE /api/news/ogp-groups/[id] — creator or admin. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;

  let userId = auth.userId;
  if (auth.isSuperAdmin) {
    userId = await getOrCreateUserForSuperAdmin(auth.userId);
  }
  const { id } = await params;

  try {
    const existing = await prisma.ogpNewsGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isCreator = existing.userId === userId;
    if (!auth.isAdmin && !isCreator) {
      return NextResponse.json(
        { error: 'Only the creator or admin can delete this group' },
        { status: 403 }
      );
    }

    if (auth.isAdmin) {
      await prisma.ogpNewsGroup.delete({ where: { id } });
    } else {
      await prisma.ogpNewsGroup.update({
        where: { id },
        data: { deletedAt: new Date(), deletedByUserId: userId },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/news/ogp-groups/[id]', e);
    return NextResponse.json({ error: 'Failed to delete group' }, { status: 500 });
  }
}

/** PATCH /api/news/ogp-groups/[id] — topic, name, description, visibility (creator or admin). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;

  let userId = auth.userId;
  if (auth.isSuperAdmin) {
    userId = await getOrCreateUserForSuperAdmin(auth.userId);
  }
  const { id } = await params;

  try {
    const existing = await prisma.ogpNewsGroup.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    const isCreator = existing.userId === userId;
    if (!auth.isAdmin && !isCreator) {
      return NextResponse.json(
        { error: 'Only the creator or admin can update this group' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data: {
      topic?: string;
      name?: string;
      customDescription?: string | null;
      visibilityUserTypes?: string;
      visibilityCountries?: string;
      visibilityLanguages?: string;
      visibilitySports?: string;
      expiresAt?: Date | null;
    } = {};

    if (body.topic !== undefined && typeof body.topic === 'string' && body.topic.trim()) {
      data.topic = body.topic.trim();
    }
    if (body.name !== undefined && typeof body.name === 'string' && body.name.trim()) {
      data.name = body.name.trim();
    }
    if (body.customDescription !== undefined) {
      data.customDescription =
        typeof body.customDescription === 'string' ? body.customDescription.trim() || null : null;
    }
    if (body.visibilityUserTypes !== undefined) {
      data.visibilityUserTypes = JSON.stringify(parseJsonArray(body.visibilityUserTypes));
    }
    if (body.visibilityCountries !== undefined) {
      data.visibilityCountries = JSON.stringify(parseJsonArray(body.visibilityCountries));
    }
    if (body.visibilityLanguages !== undefined) {
      data.visibilityLanguages = JSON.stringify(parseJsonArray(body.visibilityLanguages));
    }
    if (body.visibilitySports !== undefined) {
      data.visibilitySports = JSON.stringify(parseJsonArray(body.visibilitySports));
    }
    if (body.expiresAt !== undefined) {
      if (body.expiresAt == null || body.expiresAt === '') {
        data.expiresAt = null;
      } else {
        const d = new Date(body.expiresAt);
        data.expiresAt = Number.isNaN(d.getTime()) ? null : d;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    if (data.name && data.name !== existing.name) {
      const clash = await prisma.ogpNewsGroup.findUnique({
        where: { userId_name: { userId: existing.userId, name: data.name } },
      });
      if (clash && clash.id !== id) {
        return NextResponse.json({ error: 'A group with this name already exists' }, { status: 409 });
      }
    }

    await prisma.ogpNewsGroup.update({ where: { id }, data });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PATCH /api/news/ogp-groups/[id]', e);
    return NextResponse.json({ error: 'Failed to update group' }, { status: 500 });
  }
}
