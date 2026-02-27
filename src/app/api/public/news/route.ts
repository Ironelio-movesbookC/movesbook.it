import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deserializeMultiLanguageContent } from '@/lib/news/contentParser';
import { SportType } from '@prisma/client';
import { LANGUAGE_CODE_MAP, SPORT_ID_TO_SPORT_TYPE } from '@/lib/news/mappings';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get('categoryId');
    const sportId = searchParams.get('sportId');
    const languageId = searchParams.get('languageId');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const skip = (page - 1) * limit;

    const where: any = {};

    if (categoryId) {
      where.newsCategoryId = categoryId;
    }

    if (sportId) {
      const mappedSport = SPORT_ID_TO_SPORT_TYPE[sportId] ?? (sportId as unknown as SportType);
      where.settings = {
        some: {
          sports: {
            some: {
              sport: mappedSport,
            },
          },
        },
      };
    }

    if (languageId) {
      const languageCode = LANGUAGE_CODE_MAP[languageId];
      if (languageCode) {
        const language = await prisma.language.findUnique({
          where: { code: languageCode },
          select: { id: true },
        });
        if (language) {
          where.languageTitles = {
            some: {
              languageId: language.id,
            },
          };
        }
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        {
          languageTitles: {
            some: {
              title: { contains: search, mode: 'insensitive' },
            },
          },
        },
      ];
    }

    const [news, total] = await Promise.all([
      prisma.news.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              categoryName: true,
            },
          },
          languageTitles: {
            include: {
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
            include: {
              sports: {
                select: {
                  sport: true,
                },
              },
            },
          },
        },
      }),
      prisma.news.count({ where }),
    ]);

    const userIds = news.map(item => item.userId).filter((id): id is string => id !== null);
    const usersMap = new Map<string, { id: string; username: string; image: string | null; firstname: string | null; lastname: string | null }>();
    
    if (userIds.length > 0) {
      try {
        const users = await prisma.user.findMany({
          where: {
            id: { in: userIds },
          },
          select: {
            id: true,
            username: true,
            firstName: true,
            surname: true,
          },
        });
        
        let imageMap = new Map<string, string | null>();
        try {
          const userIdsStr = userIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',');
          const usersWithImages = await prisma.$queryRawUnsafe<Array<{ id: string; image: string | null }>>(
            `SELECT id, image FROM users_new WHERE id IN (${userIdsStr})`
          );
          usersWithImages.forEach(u => {
            imageMap.set(u.id, u.image);
          });
        } catch (imageError) {
          console.warn('Could not fetch user images (field may not exist in database):', imageError);
        }
        
        users.forEach(user => {
          usersMap.set(user.id, { 
            id: user.id, 
            username: user.username, 
            image: imageMap.get(user.id) || null,
            firstname: user.firstName || null,
            lastname: user.surname || null
          });
        });
      } catch (error) {
        console.error('Error fetching users for news:', error);
      }
    }

    const formattedNews = news.map((item) => {
      let deserializedContent: Record<string, string> = {};
      if (item.content) {
        try {
          const rawContentLength = item.content.length;
          deserializedContent = deserializeMultiLanguageContent(item.content);
          
          const enContent = deserializedContent['en'] || '';
          const enContentLength = enContent.length;
          
          if (enContentLength > 0 && enContentLength <= 135) {
            console.warn(`[API] News ${item.id}: Content seems truncated. Raw length: ${rawContentLength}, EN content length: ${enContentLength}, First 200 chars: ${enContent.substring(0, 200)}`);
          }
        } catch (error) {
          console.error('Error deserializing content for news:', item.id, error);
          deserializedContent = {};
        }
      }

      return {
        id: item.id,
        title: item.title,
        content: deserializedContent,
        image: item.image,
        createdAt: item.createdAt.toISOString(),
        mode: item.mode || null,
        internetLinkEditor: item.internetLinkEditor || null,
        inLastNews: item.inLastNews || 'N',
        feturedNews: item.feturedNews || 'N',
        author: item.author || null,
        originalAuthor: item.originalAuthor || null,
        searchingKeywords: item.searchingKeywords || null,
        briefDesc: item.briefDesc || null,
        category: item.category ? {
          id: item.category.id,
          categoryName: item.category.categoryName,
        } : null,
        languageTitles: item.languageTitles.map((lt) => ({
          title: lt.title,
          language: {
            code: lt.language.code,
            name: lt.language.name,
          },
        })),
        settings: item.settings.map((setting) => ({
          sports: setting.sports.map((sport) => ({
            sport: sport.sport,
          })),
        })),
        user: item.userId ? (usersMap.get(item.userId) ? {
          id: usersMap.get(item.userId)!.id,
          username: usersMap.get(item.userId)!.username,
          image: usersMap.get(item.userId)!.image,
          firstname: usersMap.get(item.userId)!.firstname,
          lastname: usersMap.get(item.userId)!.lastname,
        } : null) : null,
      };
    });

    return NextResponse.json({
      news: formattedNews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching news:', error);
    return NextResponse.json(
      { error: 'Failed to fetch news', details: error.message },
      { status: 500 }
    );
  }
}
