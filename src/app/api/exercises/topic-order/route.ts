import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../auth';
import { requireCategory } from '../category';

function parseCategoryTopicMap(raw: string | null | undefined): Record<string, string[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(value)) continue;
      result[key] = value.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
    }
    return result;
  } catch {
    return {};
  }
}

function sanitizeTopicList(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  const { searchParams } = new URL(request.url);
  const category = requireCategory(searchParams.get('category'));
  if (category instanceof NextResponse) return category;

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { exerciseTopicOrder: true, exerciseHiddenTopics: true },
    });
    const orderMap = parseCategoryTopicMap(settings?.exerciseTopicOrder);
    const hiddenMap = parseCategoryTopicMap(settings?.exerciseHiddenTopics);
    return NextResponse.json({
      category,
      order: orderMap[category] ?? [],
      hiddenTopics: hiddenMap[category] ?? [],
    });
  } catch (e) {
    console.error('GET /api/exercises/topic-order', e);
    return NextResponse.json({ error: 'Failed to load topic order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const category = requireCategory(body?.category);
    if (category instanceof NextResponse) return category;

    const order = sanitizeTopicList(body?.order);
    const hiddenTopics = sanitizeTopicList(body?.hiddenTopics);

    const existing = await prisma.userSettings.findUnique({
      where: { userId },
      select: { exerciseTopicOrder: true, exerciseHiddenTopics: true },
    });

    const orderMap = parseCategoryTopicMap(existing?.exerciseTopicOrder);
    const hiddenMap = parseCategoryTopicMap(existing?.exerciseHiddenTopics);
    orderMap[category] = order;
    hiddenMap[category] = hiddenTopics;

    const orderJson = JSON.stringify(orderMap);
    const hiddenJson = JSON.stringify(hiddenMap);

    if (existing) {
      await prisma.userSettings.update({
        where: { userId },
        data: {
          exerciseTopicOrder: orderJson,
          exerciseHiddenTopics: hiddenJson,
        },
      });
    } else {
      await prisma.userSettings.create({
        data: {
          userId,
          widgetArrangement: '[]',
          colorSettings: '{}',
          adminSettings: '{}',
          favouritesSettings: '{}',
          myBestSettings: '{}',
          notificationSettings: '{}',
          socialSettings: '{}',
          toolsSettings: '{}',
          workoutPreferences: '{}',
          exerciseTopicOrder: orderJson,
          exerciseHiddenTopics: hiddenJson,
        },
      });
    }
    return NextResponse.json({ category, order, hiddenTopics });
  } catch (e) {
    console.error('PUT /api/exercises/topic-order', e);
    return NextResponse.json({ error: 'Failed to save topic order' }, { status: 500 });
  }
}
