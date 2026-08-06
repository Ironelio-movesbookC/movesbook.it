import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser } from '../../auth';

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

/** Only super admin, admin, or the article creator can delete. Admin/super_admin: permanent delete. Creator: soft delete. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isAdmin } = auth;
  const { id } = await params;

  try {
    const existing = await prisma.exerciseOgpArticle.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const isCreator = existing.userId === userId;
    const canDelete = isAdmin || isCreator;
    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only super admin, admin, or the article creator can delete OGP articles' },
        { status: 403 }
      );
    }

    if (isAdmin) {
      await prisma.exerciseOgpArticle.delete({ where: { id } });
    } else {
      await prisma.exerciseOgpArticle.update({
        where: { id },
        data: { deletedAt: new Date(), deletedByUserId: userId },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('DELETE /api/exercises/ogp/[id]', e);
    return NextResponse.json({ error: 'Failed to delete article' }, { status: 500 });
  }
}

/** Only super admin, admin, or the article creator can update OGP visibility settings. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isAdmin } = auth;
  const { id } = await params;

  try {
    const existing = await prisma.exerciseOgpArticle.findUnique({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Article not found' }, { status: 404 });
    }

    const isCreator = existing.userId === userId;
    const canUpdate = isAdmin || isCreator;
    if (!canUpdate) {
      return NextResponse.json(
        { error: 'Only super admin, admin, or the article creator can update OGP settings' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const data: {
      topic?: string;
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
    if (body.customDescription !== undefined) {
      data.customDescription = typeof body.customDescription === 'string'
        ? (body.customDescription.trim() || null)
        : null;
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
      data.expiresAt = body.expiresAt != null && body.expiresAt !== ''
        ? new Date(body.expiresAt)
        : null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    await prisma.exerciseOgpArticle.update({
      where: { id },
      data,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('PATCH /api/exercises/ogp/[id]', e);
    return NextResponse.json({ error: 'Failed to update article settings' }, { status: 500 });
  }
}
