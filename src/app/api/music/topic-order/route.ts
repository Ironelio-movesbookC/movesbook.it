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

function parseHiddenTopics(raw: string | null | undefined): string[] {
  return parseTopicOrder(raw);
}

function parseGenreOrder(raw: string | null | undefined): Record<string, string[]> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const result: Record<string, string[]> = {};
    for (const [topic, genres] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof topic !== 'string' || !topic.trim()) continue;
      if (!Array.isArray(genres)) continue;
      const list = genres.filter((g): g is string => typeof g === 'string' && g.trim() !== '');
      if (list.length > 0) result[topic.trim()] = list;
    }
    return result;
  } catch {
    return {};
  }
}

function sanitizeGenreOrder(input: unknown): Record<string, string[]> {
  if (input == null || typeof input !== 'object' || Array.isArray(input)) return {};
  const result: Record<string, string[]> = {};
  for (const [topic, genres] of Object.entries(input as Record<string, unknown>)) {
    if (typeof topic !== 'string' || !topic.trim()) continue;
    if (!Array.isArray(genres)) continue;
    const list = genres.filter((g): g is string => typeof g === 'string' && g.trim() !== '');
    result[topic.trim()] = list;
  }
  return result;
}

function sanitizeHiddenTopics(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
}

async function readMusicTopicGenreOrder(userId: string): Promise<Record<string, string[]>> {
  const rows = await prisma.$queryRaw<Array<{ musicTopicGenreOrder: string | null }>>`
    SELECT musicTopicGenreOrder FROM user_settings WHERE userId = ${userId} LIMIT 1
  `;
  return parseGenreOrder(rows[0]?.musicTopicGenreOrder ?? null);
}

async function writeMusicTopicGenreOrder(userId: string, genreOrder: Record<string, string[]>): Promise<void> {
  const json = JSON.stringify(genreOrder);
  await prisma.$executeRaw`
    UPDATE user_settings SET musicTopicGenreOrder = ${json} WHERE userId = ${userId}
  `;
}

async function readMusicHiddenTopics(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ musicHiddenTopics: string | null }>>`
    SELECT musicHiddenTopics FROM user_settings WHERE userId = ${userId} LIMIT 1
  `;
  return parseHiddenTopics(rows[0]?.musicHiddenTopics ?? null);
}

async function writeMusicHiddenTopics(userId: string, hiddenTopics: string[]): Promise<void> {
  const json = JSON.stringify(hiddenTopics);
  await prisma.$executeRaw`
    UPDATE user_settings SET musicHiddenTopics = ${json} WHERE userId = ${userId}
  `;
}

async function readMusicHiddenGenres(userId: string): Promise<Record<string, string[]>> {
  const rows = await prisma.$queryRaw<Array<{ musicHiddenGenres: string | null }>>`
    SELECT musicHiddenGenres FROM user_settings WHERE userId = ${userId} LIMIT 1
  `;
  return parseGenreOrder(rows[0]?.musicHiddenGenres ?? null);
}

async function writeMusicHiddenGenres(userId: string, hiddenGenres: Record<string, string[]>): Promise<void> {
  const json = JSON.stringify(hiddenGenres);
  await prisma.$executeRaw`
    UPDATE user_settings SET musicHiddenGenres = ${json} WHERE userId = ${userId}
  `;
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const settings = await prisma.userSettings.findUnique({
      where: { userId },
      select: { musicTopicOrder: true },
    });
    const order = parseTopicOrder(settings?.musicTopicOrder ?? null);
    const genreOrder = await readMusicTopicGenreOrder(userId);
    const hiddenTopics = await readMusicHiddenTopics(userId);
    const hiddenGenres = await readMusicHiddenGenres(userId);
    return NextResponse.json({ order, genreOrder, hiddenTopics, hiddenGenres });
  } catch (e) {
    console.error('GET /api/music/topic-order', e);
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
    const sanitizedOrder = order.filter((x: unknown): x is string => typeof x === 'string');
    const genreOrder = sanitizeGenreOrder(body?.genreOrder);
    const hiddenTopics = sanitizeHiddenTopics(body?.hiddenTopics);
    const hiddenGenres = sanitizeGenreOrder(body?.hiddenGenres);

    const existing = await prisma.userSettings.findUnique({
      where: { userId },
    });
    if (existing) {
      await prisma.userSettings.update({
        where: { userId },
        data: { musicTopicOrder: JSON.stringify(sanitizedOrder) },
      });
      await writeMusicTopicGenreOrder(userId, genreOrder);
      await writeMusicHiddenTopics(userId, hiddenTopics);
      await writeMusicHiddenGenres(userId, hiddenGenres);
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
          musicTopicOrder: JSON.stringify(sanitizedOrder),
        },
      });
      await writeMusicTopicGenreOrder(userId, genreOrder);
      await writeMusicHiddenTopics(userId, hiddenTopics);
      await writeMusicHiddenGenres(userId, hiddenGenres);
    }
    return NextResponse.json({
      order: sanitizedOrder,
      genreOrder,
      hiddenTopics,
      hiddenGenres,
    });
  } catch (e) {
    console.error('PUT /api/music/topic-order', e);
    return NextResponse.json({ error: 'Failed to save topic order' }, { status: 500 });
  }
}
