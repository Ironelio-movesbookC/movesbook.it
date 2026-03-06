import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    let viewerUserId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.split(' ')[1]);
      if (decoded?.userId) viewerUserId = decoded.userId;
    }

    const news = await prisma.news.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            id: true,
            categoryName: true,
          },
        },
        originalLanguage: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        languageTitles: {
          select: {
            title: true,
            language: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
        },
        settings: {
          select: {
            id: true,
            functions: true,
            reshare: true,
            sports: {
              select: {
                sport: true,
              },
            },
          },
        },
        relatedArticles: {
          select: {
            article: {
              select: {
                id: true,
                title: true,
                image: true,
                createdAt: true,
                section: true,
              },
            },
          },
        },
      },
    });

    if (!news) {
      return NextResponse.json({ error: 'News not found' }, { status: 404 });
    }

    let writerImageUrl: string | null = null;
    if ((news as any).showWriterImage && news.writerUsername) {
      try {
        const writerUsername = news.writerUsername.toLowerCase();
        const rows = await prisma.$queryRawUnsafe<Array<{ image: string | null }>>(
          `SELECT image FROM users_new WHERE username = ? OR email = ? LIMIT 1`,
          writerUsername,
          writerUsername
        );
        if (rows && rows.length > 0 && rows[0].image) {
          const rawImage = rows[0].image;
          writerImageUrl = (rawImage.startsWith('http') || rawImage.startsWith('/'))
            ? rawImage
            : `/img/profile_images/${rawImage}`;
        }
      } catch {
        writerImageUrl = null;
      }
    }

    let reshareDisabled = false;
    if (viewerUserId) {
      try {
        const friends = await prisma.user.findMany({
          where: {
            OR: [
              { conversationsStarted: { some: { user2Id: viewerUserId } } },
              { conversationsReceived: { some: { user1Id: viewerUserId } } },
            ],
            id: { not: viewerUserId },
          },
          select: { id: true },
          take: 200,
        });
        const friendIds = friends.map((f) => f.id);

        const directBlock = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
          `SELECT COUNT(*) AS cnt FROM news_share_post
           WHERE news_id = ? AND friends_user_id = ? AND is_reshare_disabled = 1`,
          id, viewerUserId
        );

        let friendBlock = false;
        if (friendIds.length > 0) {
          const ph = friendIds.map(() => '?').join(',');
          const rows = await prisma.$queryRawUnsafe<Array<{ cnt: bigint }>>(
            `SELECT COUNT(*) AS cnt FROM news_share_post
             WHERE news_id = ? AND share_option = 2 AND user_id IN (${ph}) AND is_reshare_disabled = 1`,
            id, ...friendIds
          );
          friendBlock = Number(rows[0]?.cnt ?? 0) > 0;
        }

        reshareDisabled = Number(directBlock[0]?.cnt ?? 0) > 0 || friendBlock;
      } catch {
        reshareDisabled = false;
      }
    }

    const formattedNews = {
      id: news.id,
      title: news.title,
      content: news.content || '',
      image: news.image,
      bannerImage: news.bannerImage,
      createdAt: news.createdAt.toISOString(),
      date: news.date.toISOString(),
      author: news.author || null,
      originalAuthor: news.originalAuthor || null,
      mode: news.mode || 'content',
      internetLink: news.internetLink || null,
      internetLinkEditor: news.internetLinkEditor || null,
      pageOption: news.pageOption || null,
      searchingKeywords: news.searchingKeywords || null,
      visualizeInReadingPageAuthorName: news.visualizeInReadingPageAuthorName || 'N',
      visualizeInReadingPageActualAuthorName: news.visualizeInReadingPageActualAuthorName || 'N',
      checkedBanner: news.checkedBanner || 'N',
      showWriterImage: (news as any).showWriterImage || false,
      writerImage: writerImageUrl,
      reshareDisabled,
      category: news.category ? {
        id: news.category.id,
        categoryName: news.category.categoryName,
      } : null,
      originalLanguage: news.originalLanguage ? {
        id: news.originalLanguage.id,
        code: news.originalLanguage.code,
        name: news.originalLanguage.name,
      } : null,
      languageTitles: news.languageTitles.map((lt) => ({
        title: lt.title,
        language: {
          id: lt.language.id,
          code: lt.language.code,
          name: lt.language.name,
        },
      })),
      settings: news.settings.map((setting) => {
        const functions = setting.functions
          ? (typeof setting.functions === 'string' ? JSON.parse(setting.functions) : setting.functions)
          : {};
        return {
          reshare: setting.reshare === 'Y',
          sports: setting.sports.map((sport) => ({ sport: sport.sport })),
          functions,
        };
      }),
      relatedArticles: news.relatedArticles.map((ra) => ({
        id: ra.article.id,
        title: ra.article.title,
        image: ra.article.image,
        createdAt: ra.article.createdAt.toISOString(),
        section: ra.article.section,
      })),
    };

    return NextResponse.json(formattedNews);
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', details: error.message },
      { status: 500 }
    );
  }
}
