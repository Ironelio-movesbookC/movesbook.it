import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '../auth';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { newsTopicOrder: true },
    });
    const order: string[] = settings?.newsTopicOrder
      ? (JSON.parse(settings.newsTopicOrder) as string[])
      : [];
    return NextResponse.json({ order });
  } catch (e) {
    console.error('GET /api/news/topic-order', e);
    return NextResponse.json({ error: 'Failed to load topic order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const order = Array.isArray(body?.order) ? body.order : [];
    const sanitized = order.filter((x: unknown): x is string => typeof x === 'string');

    const existing = await prisma.userSettings.findUnique({
      where: { userId },
    });
    if (existing) {
      await prisma.userSettings.update({
        where: { userId },
        data: { newsTopicOrder: JSON.stringify(sanitized) },
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
          newsTopicOrder: JSON.stringify(sanitized),
        },
      });
    }
    return NextResponse.json({ order: sanitized });
  } catch (e) {
    console.error('PUT /api/news/topic-order', e);
    return NextResponse.json({ error: 'Failed to save topic order' }, { status: 500 });
  }
}
