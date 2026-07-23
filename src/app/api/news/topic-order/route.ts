import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../auth';

function parseTopicOrder(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  } catch {
    return [];
  }
}

function sanitizeHiddenTopics(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
}

async function readNewsHiddenTopics(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ newsHiddenTopics: string | null }>>`
    SELECT newsHiddenTopics FROM user_settings WHERE userId = ${userId} LIMIT 1
  `;
  return parseTopicOrder(rows[0]?.newsHiddenTopics ?? null);
}

async function writeNewsHiddenTopics(userId: string, hiddenTopics: string[]): Promise<void> {
  const json = JSON.stringify(hiddenTopics);
  await prisma.$executeRaw`
    UPDATE user_settings SET newsHiddenTopics = ${json} WHERE userId = ${userId}
  `;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthForNews(request);
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
    const hiddenTopics = await readNewsHiddenTopics(userId);
    return NextResponse.json({ order, hiddenTopics });
  } catch (e) {
    console.error('GET /api/news/topic-order', e);
    return NextResponse.json({ error: 'Failed to load topic order' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const order = Array.isArray(body?.order) ? body.order : [];
    const sanitized = order.filter((x: unknown): x is string => typeof x === 'string');
    const hiddenTopics = sanitizeHiddenTopics(body?.hiddenTopics);

    const existing = await prisma.userSettings.findUnique({
      where: { userId },
    });
    if (existing) {
      await prisma.userSettings.update({
        where: { userId },
        data: { newsTopicOrder: JSON.stringify(sanitized) },
      });
      await writeNewsHiddenTopics(userId, hiddenTopics);
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
      await writeNewsHiddenTopics(userId, hiddenTopics);
    }
    return NextResponse.json({ order: sanitized, hiddenTopics });
  } catch (e) {
    console.error('PUT /api/news/topic-order', e);
    return NextResponse.json({ error: 'Failed to save topic order' }, { status: 500 });
  }
}
