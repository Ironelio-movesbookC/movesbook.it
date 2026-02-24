import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const relatedArticles = await prisma.newsRelatedArticle.findMany({
      where: { newsId: id },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            image: true,
            section: true,
            createdAt: true,
            author: true,
            originalAuthor: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(relatedArticles);
  } catch (error: any) {
    console.error('Error fetching related articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related articles', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = verifyToken(token);
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { articleIds } = body;

    if (!articleIds || !Array.isArray(articleIds)) {
      return NextResponse.json(
        { error: 'articleIds array is required' },
        { status: 400 }
      );
    }

    await prisma.newsRelatedArticle.deleteMany({
      where: { newsId: id },
    });

    const relatedArticles = await prisma.newsRelatedArticle.createMany({
      data: articleIds.map((articleId: string) => ({
        newsId: id,
        articleId: articleId,
      })),
      skipDuplicates: true,
    });

    const createdRelated = await prisma.newsRelatedArticle.findMany({
      where: { newsId: id },
      include: {
        article: {
          select: {
            id: true,
            title: true,
            image: true,
            section: true,
            createdAt: true,
            author: true,
            originalAuthor: true,
          },
        },
      },
    });

    return NextResponse.json(createdRelated);
  } catch (error: any) {
    console.error('Error saving related articles:', error);
    return NextResponse.json(
      { error: 'Failed to save related articles', details: error.message },
      { status: 500 }
    );
  }
}
