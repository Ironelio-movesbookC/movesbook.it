import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminAuth } from '@/lib/adminAuth';
import { mapGlobalEntryToGridRecord } from '@/lib/globalWorkoutArchiveMapper';
import {
  defaultPayloadForRecordType,
  serializeGlobalArchivePictureUrls,
} from '@/lib/globalWorkoutArchivePictures';
import type { GlobalArchiveRecordType } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const recordType = searchParams.get('recordType') as GlobalArchiveRecordType | null;
    const sport = searchParams.get('sport');
    const search = searchParams.get('search')?.trim();
    const includeDisabled = searchParams.get('includeDisabled') === 'true';
    const favoritesOnly = searchParams.get('favoritesOnly') === 'true';

    const entries = await prisma.globalWorkoutArchiveEntry.findMany({
      where: {
        ...(recordType ? { recordType } : {}),
        ...(sport && sport !== 'all' ? { mainSport: sport } : {}),
        ...(!includeDisabled ? { disabled: false } : {}),
        ...(favoritesOnly ? { isFavorite: true } : {}),
        ...(search
          ? {
              OR: [
                { title: { contains: search } },
                { tags: { contains: search } },
                { shortDescription: { contains: search } },
                { sharedByUsername: { contains: search } },
              ],
            }
          : {}),
      },
      orderBy: [{ sharedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      records: entries.map(mapGlobalEntryToGridRecord),
    });
  } catch (error) {
    console.error('GET global-workout-archive:', error);
    return NextResponse.json({ error: 'Failed to load global archive' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!(await requireAdminAuth(request))) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      recordType = 'WORKOUT',
      title,
      mainSport,
      mainGoal,
      trainingLevel,
      period,
      tags,
      originalLanguages,
      authorCountry,
      shortDescription,
      expirationDate,
      payloadData,
      thumbnailUrl,
      pictureUrls,
    } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const resolvedPayload =
      payloadData != null
        ? typeof payloadData === 'string'
          ? payloadData
          : JSON.stringify(payloadData)
        : JSON.stringify(defaultPayloadForRecordType(recordType));

    const entry = await prisma.globalWorkoutArchiveEntry.create({
      data: {
        recordType,
        title: title.trim(),
        mainSport: mainSport ?? null,
        mainGoal: mainGoal ?? null,
        trainingLevel: trainingLevel ?? null,
        period: period ?? null,
        tags: tags ?? null,
        originalLanguages: originalLanguages ?? null,
        authorCountry: authorCountry ?? null,
        shortDescription: shortDescription ?? null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        thumbnailUrl: thumbnailUrl ? String(thumbnailUrl) : null,
        pictureUrls: pictureUrls
          ? serializeGlobalArchivePictureUrls(
              Array.isArray(pictureUrls) ? pictureUrls : String(pictureUrls).split('\n')
            )
          : null,
        payloadData: resolvedPayload,
        sharedAt: new Date(),
      },
    });

    return NextResponse.json({ record: mapGlobalEntryToGridRecord(entry) });
  } catch (error) {
    console.error('POST global-workout-archive:', error);
    return NextResponse.json({ error: 'Failed to create entry' }, { status: 500 });
  }
}
