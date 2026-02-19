import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '../auth';

export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic'); // optional filter

  try {
    const where: { userId: string; topic?: string } = { userId };
    if (topic != null && topic !== '') where.topic = topic;
    const list = await prisma.ogpArticle.findMany({
      where,
      orderBy: { savedAt: 'desc' },
    });
    const articles = list.map((a) => ({
      id: a.id,
      title: a.title,
      image: a.image,
      description: a.description,
      url: a.url,
      siteName: a.siteName,
      type: a.type,
      customDescription: a.customDescription,
      topic: a.topic,
      savedAt: a.savedAt.toISOString(),
    }));
    return NextResponse.json(articles);
  } catch (e) {
    console.error('GET /api/news/ogp', e);
    return NextResponse.json({ error: 'Failed to load articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const {
      title,
      image,
      description,
      url,
      siteName,
      type,
      customDescription,
      topic,
    } = body;
    if (!url || typeof url !== 'string' || !url.trim()) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    const topicName = typeof topic === 'string' && topic.trim() ? topic.trim() : 'News';
    const created = await prisma.ogpArticle.create({
      data: {
        userId,
        title: title ?? null,
        image: image ?? null,
        description: description ?? null,
        url: url.trim(),
        siteName: siteName ?? null,
        type: type ?? null,
        customDescription: customDescription ?? null,
        topic: topicName,
      },
    });
    return NextResponse.json({
      id: created.id,
      title: created.title,
      image: created.image,
      description: created.description,
      url: created.url,
      siteName: created.siteName,
      type: created.type,
      customDescription: created.customDescription,
      topic: created.topic,
      savedAt: created.savedAt.toISOString(),
    });
  } catch (e) {
    console.error('POST /api/news/ogp', e);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
