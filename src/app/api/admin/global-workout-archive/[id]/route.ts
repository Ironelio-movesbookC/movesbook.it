import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { mapGlobalEntryToGridRecord } from '@/lib/globalWorkoutArchiveMapper';
import { serializeGlobalArchivePictureUrls } from '@/lib/globalWorkoutArchivePictures';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const pictureUrls =
      body.pictureUrls != null
        ? serializeGlobalArchivePictureUrls(
            Array.isArray(body.pictureUrls) ? body.pictureUrls : []
          )
        : undefined;

    const entry = await prisma.globalWorkoutArchiveEntry.update({
      where: { id: params.id },
      data: {
        ...(body.title != null ? { title: String(body.title) } : {}),
        ...(body.disabled != null ? { disabled: Boolean(body.disabled) } : {}),
        ...(body.isFavorite != null ? { isFavorite: Boolean(body.isFavorite) } : {}),
        ...(body.shortDescription != null ? { shortDescription: body.shortDescription } : {}),
        ...(body.thumbnailUrl !== undefined
          ? { thumbnailUrl: body.thumbnailUrl ? String(body.thumbnailUrl) : null }
          : {}),
        ...(pictureUrls !== undefined ? { pictureUrls } : {}),
        ...(body.expirationDate != null
          ? { expirationDate: body.expirationDate ? new Date(body.expirationDate) : null }
          : {}),
      },
    });

    return NextResponse.json({ record: mapGlobalEntryToGridRecord(entry) });
  } catch (error) {
    console.error('PATCH global-workout-archive:', error);
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.globalWorkoutArchiveEntry.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE global-workout-archive:', error);
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }
}
