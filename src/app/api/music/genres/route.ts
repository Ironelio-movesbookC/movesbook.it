import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../auth';

function parseGenres(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x): x is string => typeof x === 'string' && x.trim() !== '');
  } catch {
    return [];
  }
}

async function readMusicGenres(userId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ musicGenres: string | null }>>`
    SELECT musicGenres FROM user_settings WHERE userId = ${userId} LIMIT 1
  `;
  return parseGenres(rows[0]?.musicGenres ?? null);
}

async function writeMusicGenres(userId: string, genres: string[]): Promise<void> {
  const json = JSON.stringify(genres);
  const existing = await prisma.userSettings.findUnique({
    where: { userId },
    select: { userId: true },
  });
  if (existing) {
    await prisma.$executeRaw`
      UPDATE user_settings SET musicGenres = ${json} WHERE userId = ${userId}
    `;
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
      },
    });
    await prisma.$executeRaw`
      UPDATE user_settings SET musicGenres = ${json} WHERE userId = ${userId}
    `;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const genres = await readMusicGenres(userId);
    return NextResponse.json({ genres });
  } catch (e) {
    console.error('GET /api/music/genres', e);
    return NextResponse.json({ error: 'Failed to load musical genres' }, { status: 500 });
  }
}

/** Body: { genre: string } — appends genre if not already present. */
export async function POST(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const genre = typeof body?.genre === 'string' ? body.genre.trim() : '';
    if (!genre) {
      return NextResponse.json({ error: 'Genre is required' }, { status: 400 });
    }

    const current = await readMusicGenres(userId);
    const next = current.includes(genre) ? current : [...current, genre];
    await writeMusicGenres(userId, next);

    return NextResponse.json({ genres: next });
  } catch (e) {
    console.error('POST /api/music/genres', e);
    return NextResponse.json({ error: 'Failed to save musical genre' }, { status: 500 });
  }
}
