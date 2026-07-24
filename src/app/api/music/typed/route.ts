import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews } from '../auth';

export async function GET(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const list = await prisma.musicTypedArticle.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    const articles = list.map((a) => ({
      id: a.id,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    }));
    return NextResponse.json(articles);
  } catch (e) {
    console.error('GET /api/music/typed', e);
    return NextResponse.json({ error: 'Failed to load typed articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const description = typeof body.description === 'string' ? body.description.trim() : '';
    if (!description) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }
    const created = await prisma.musicTypedArticle.create({
      data: { userId, description },
    });
    return NextResponse.json({
      id: created.id,
      description: created.description,
      createdAt: created.createdAt.toISOString(),
    });
  } catch (e) {
    console.error('POST /api/music/typed', e);
    return NextResponse.json({ error: 'Failed to create typed article' }, { status: 500 });
  }
}
