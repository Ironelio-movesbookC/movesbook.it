import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveNutritionDatabaseUserId } from '@/lib/nutritionUserId';
import { computeNameEnglish, stringifyRecord } from '@/lib/sportMachineHelpers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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
    const dbUserId = await resolveNutritionDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get('sortBy') === 'company' ? 'company' : 'name';
    const sortDir: Prisma.SortOrder =
      searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';
    const filterName = searchParams.get('filterName')?.trim() || '';
    const filterCompany = searchParams.get('filterCompany')?.trim() || '';

    const where: {
      userId: string;
      AND?: Array<Record<string, unknown>>;
    } = { userId: dbUserId };

    const and: Array<Record<string, unknown>> = [];
    if (filterName) {
      and.push({
        OR: [
          { nameEnglish: { contains: filterName } },
          { originalName: { contains: filterName } },
          { companyName: { contains: filterName } },
          { code: { contains: filterName } },
        ],
      });
    }
    if (filterCompany) {
      and.push({ companyName: { contains: filterCompany } });
    }
    if (and.length) where.AND = and;

    const orderBy =
      sortBy === 'company'
        ? { companyName: sortDir }
        : { nameEnglish: sortDir };

    const machines = await prisma.sportMachine.findMany({
      where,
      orderBy,
      include: {
        company: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    });

    return NextResponse.json({ machines });
  } catch (e) {
    console.error('sport-machines GET', e);
    return NextResponse.json({ error: 'Failed to load machines' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const dbUserId = await resolveNutritionDatabaseUserId(decoded.userId);
    if (!dbUserId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
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
    } = body;

    if (!originalName || typeof originalName !== 'string' || !originalName.trim()) {
      return NextResponse.json({ error: 'Original name is required' }, { status: 400 });
    }
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    }
    if (!mainArea || typeof mainArea !== 'string' || !mainArea.trim()) {
      return NextResponse.json({ error: 'Main area is required' }, { status: 400 });
    }
    if (!code || typeof code !== 'string' || !code.trim()) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const nameMap =
      nameByLanguage && typeof nameByLanguage === 'object' ? nameByLanguage : {};
    const nameEnglish = computeNameEnglish(originalName.trim(), nameMap);

    const secondaryList = Array.isArray(secondaryAreas)
      ? secondaryAreas.filter((x: unknown) => typeof x === 'string' && x.trim())
      : typeof secondaryAreas === 'string'
        ? secondaryAreas
            .split(',')
            .map((s: string) => s.trim())
            .filter(Boolean)
        : [];

    const descMap =
      descriptionByLanguage && typeof descriptionByLanguage === 'object'
        ? descriptionByLanguage
        : {};
    const otherPics = Array.isArray(otherPictures)
      ? otherPictures.filter((x: unknown) => typeof x === 'string' && x.trim())
      : [];

    let companyId: string | null =
      typeof sportMachineCompanyId === 'string' && sportMachineCompanyId
        ? sportMachineCompanyId
        : null;
    if (companyId) {
      const c = await prisma.sportMachineCompany.findUnique({
        where: { id: companyId },
        select: { id: true },
      });
      if (!c) companyId = null;
    }

    const row = await prisma.sportMachine.create({
      data: {
        userId: dbUserId,
        sportMachineCompanyId: companyId,
        companyName: companyName.trim(),
        originalName: originalName.trim(),
        nameEnglish,
        nameByLanguage: stringifyRecord(nameMap as Record<string, string>),
        mainArea: mainArea.trim(),
        secondaryAreasJson:
          secondaryList.length > 0 ? JSON.stringify(secondaryList) : null,
        code: code.trim(),
        pictureAUrl: pictureAUrl?.trim() || null,
        pictureBUrl: pictureBUrl?.trim() || null,
        otherPicturesJson: otherPics.length ? JSON.stringify(otherPics) : null,
        videoUrl: videoUrl?.trim() || null,
        descriptionByLanguage: stringifyRecord(descMap as Record<string, string>),
      },
      include: { company: { select: { id: true, name: true, logoUrl: true } } },
    });

    return NextResponse.json({ machine: row });
  } catch (e) {
    console.error('sport-machines POST', e);
    return NextResponse.json({ error: 'Failed to create machine' }, { status: 500 });
  }
}
