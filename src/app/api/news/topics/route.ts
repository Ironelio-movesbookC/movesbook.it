import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../auth';

const DEFAULT_TOPIC_NAMES = [
  'Events',
  'Nutrition',
  'Sport',
  'Training',
  'Medicine',
  'News',
  'Equipments',
  'Lounge music',
];

export async function GET(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;

  try {
    // Return all custom topics from all users so everyone sees the same topic list (SuperAdmin + athletes)
    const allCustom = await prisma.userNewsTopic.findMany({
      orderBy: [{ name: 'asc' }, { displayOrder: 'asc' }],
      select: { id: true, name: true, displayOrder: true },
    });
    // Distinct by name; keep one id per name (first occurrence for edit/delete)
    const seen = new Set<string>();
    const custom = allCustom.filter((t) => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    });
    return NextResponse.json({
      defaultTopicNames: DEFAULT_TOPIC_NAMES,
      customTopics: custom,
    });
  } catch (e) {
    console.error('GET /api/news/topics', e);
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Topic name is required' }, { status: 400 });
    }
    const count = await prisma.userNewsTopic.count({ where: { userId } });
    const created = await prisma.userNewsTopic.create({
      data: { userId, name, displayOrder: count },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A topic with this name already exists' }, { status: 409 });
    }
    console.error('POST /api/news/topics', e);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}
