import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit        = parseInt(searchParams.get('limit') || '15');
    const languageCode = searchParams.get('language') || 'en';
    const monthParam   = searchParams.get('month');
    const yearParam    = searchParams.get('year');

    const language = await prisma.language.findUnique({
      where: { code: languageCode },
      select: { id: true },
    });

    if (!language) {
      return NextResponse.json({ error: 'Language not found' }, { status: 404 });
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (yearParam || monthParam) {
      const year  = yearParam  ? parseInt(yearParam)  : new Date().getFullYear();
      const month = monthParam ? parseInt(monthParam) : null;

      if (month) {
        dateFilter.gte = new Date(year, month - 1, 1);
        dateFilter.lte = new Date(year, month, 0, 23, 59, 59, 999);
      } else {
        dateFilter.gte = new Date(year, 0, 1);
        dateFilter.lte = new Date(year, 11, 31, 23, 59, 59, 999);
      }
    }

    const whereClause = Object.keys(dateFilter).length > 0
      ? { createdAt: dateFilter }
      : {};

    const news = await prisma.news.findMany({
      where: whereClause,
      take: limit * 3,
      orderBy: { createdAt: 'desc' },
      include: {
        category: {
          select: { id: true, categoryName: true },
        },
        languageTitles: {
          where: { languageId: language.id },
          include: {
            language: {
              select: { id: true, code: true, name: true },
            },
          },
        },
      },
    });

    const priorityOrder = { high: 3, middle: 2, low: 1 };
    const sortedNews = news.sort((a, b) => {
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      if (aPriority !== bPriority) return bPriority - aPriority;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    const formattedNews = sortedNews.slice(0, limit).map((item) => {
      const languageTitle = item.languageTitles.find(
        (lt) => lt.languageId === language.id
      );

      let imageUrl = item.image || '/images/preview.jpg';
      if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('/')) {
        imageUrl = `/uploads/news/${imageUrl}`;
      }

      return {
        id:        item.id,
        title:     languageTitle?.title || item.title || 'Untitled',
        date:      item.createdAt.toISOString(),
        createdAt: item.createdAt.toISOString(),
        image:     imageUrl,
        category:  item.category
          ? { id: item.category.id, categoryName: item.category.categoryName }
          : null,
      };
    });

    return NextResponse.json({ popularPosts: formattedNews });
  } catch (error: any) {
    console.error('Error fetching popular posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch popular posts', details: error.message },
      { status: 500 }
    );
  }
}
