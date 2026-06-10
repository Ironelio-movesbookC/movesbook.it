import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';
import {
  computeNameEnglish,
  parseJsonRecord,
  stringifyRecord,
  stringifyMachineRichSections,
} from '@/lib/sportMachineHelpers';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.sportMachine.findFirst({
      where: { id, userId: dbUserId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      sportMachineCompanyId,
      companyName,
      originalName,
      nameByLanguage,
      mainArea,
      secondaryAreas,
      code,
      pictureAUrl,
      pictureBUrl,
      otherPictures,
      videoUrl,
      descriptionByLanguage,
      richSectionsJson,
    } = body;

    const nextOriginal =
      originalName !== undefined
        ? String(originalName).trim()
        : existing.originalName;
    const nameMap =
      nameByLanguage !== undefined && typeof nameByLanguage === 'object'
        ? (nameByLanguage as Record<string, string>)
        : undefined;
    const effectiveNameMap =
      nameMap !== undefined ? nameMap : parseJsonRecord(existing.nameByLanguage);
    const nameEnglish =
      originalName !== undefined || nameMap !== undefined
        ? computeNameEnglish(nextOriginal, effectiveNameMap)
        : existing.nameEnglish;

    let secondaryJson = existing.secondaryAreasJson;
    if (secondaryAreas !== undefined) {
      const secondaryList = Array.isArray(secondaryAreas)
        ? secondaryAreas.filter((x: unknown) => typeof x === 'string' && x.trim())
        : typeof secondaryAreas === 'string'
          ? secondaryAreas
              .split(',')
              .map((s: string) => s.trim())
              .filter(Boolean)
          : [];
      secondaryJson =
        secondaryList.length > 0 ? JSON.stringify(secondaryList) : null;
    }

    let otherJson = existing.otherPicturesJson;
    if (otherPictures !== undefined) {
      const otherPics = Array.isArray(otherPictures)
        ? otherPictures.filter((x: unknown) => typeof x === 'string' && x.trim())
        : [];
      otherJson = otherPics.length ? JSON.stringify(otherPics) : null;
    }

    let companyId: string | null | undefined = undefined;
    if (sportMachineCompanyId !== undefined) {
      const cid =
        typeof sportMachineCompanyId === 'string' && sportMachineCompanyId
          ? sportMachineCompanyId
          : null;
      if (cid) {
        const c = await prisma.sportMachineCompany.findUnique({
          where: { id: cid },
          select: { id: true },
        });
        companyId = c ? cid : null;
      } else {
        companyId = null;
      }
    }

    const row = await prisma.sportMachine.update({
      where: { id },
      data: {
        ...(companyId !== undefined && { sportMachineCompanyId: companyId }),
        ...(companyName !== undefined && { companyName: String(companyName).trim() }),
        ...(originalName !== undefined && { originalName: nextOriginal }),
        ...(nameMap !== undefined && { nameByLanguage: stringifyRecord(nameMap) }),
        ...((originalName !== undefined || nameMap !== undefined) && {
          nameEnglish,
        }),
        ...(mainArea !== undefined && { mainArea: String(mainArea).trim() }),
        ...(secondaryAreas !== undefined && { secondaryAreasJson: secondaryJson }),
        ...(code !== undefined && { code: String(code).trim() }),
        ...(pictureAUrl !== undefined && { pictureAUrl: pictureAUrl?.trim() || null }),
        ...(pictureBUrl !== undefined && { pictureBUrl: pictureBUrl?.trim() || null }),
        ...(otherPictures !== undefined && { otherPicturesJson: otherJson }),
        ...(videoUrl !== undefined && { videoUrl: videoUrl?.trim() || null }),
        ...(descriptionByLanguage !== undefined &&
          typeof descriptionByLanguage === 'object' && {
            descriptionByLanguage: stringifyRecord(
              descriptionByLanguage as Record<string, string>
            ),
          }),
        ...(richSectionsJson !== undefined &&
          typeof richSectionsJson === 'object' && {
            richSectionsJson: stringifyMachineRichSections(richSectionsJson),
          }),
      },
      include: { company: { select: { id: true, name: true, logoUrl: true } } },
    });

    return NextResponse.json({ machine: row });
  } catch (e) {
    console.error('sport-machines PATCH', e);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    const dbUserId = await resolveWorkoutDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.sportMachine.findFirst({
      where: { id, userId: dbUserId },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await prisma.sportMachine.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('sport-machines DELETE', e);
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }
}
