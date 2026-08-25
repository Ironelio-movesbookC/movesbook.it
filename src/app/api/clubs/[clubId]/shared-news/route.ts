import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deserializeMultiLanguageContent } from '@/lib/news/contentParser';
import {
  canViewerSeeClubSharedOgp,
  newsSettingsToClubVisibility,
  parseJsonStringArray,
  type ClubSharedFeedItem,
} from '@/lib/clubNewsShareAuth';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ clubId: string }> };

async function getClubAccess(
  userId: string,
  clubId: string,
): Promise<{ isClubAdmin: boolean; isClubMember: boolean }> {
  const club = await prisma.club.findFirst({
    where: { id: clubId, adminId: userId },
    select: { id: true },
  });
  if (club) return { isClubAdmin: true, isClubMember: true };

  const membership = await prisma.clubMember.findFirst({
    where: { clubId, memberId: userId },
    select: { id: true },
  });
  return { isClubAdmin: false, isClubMember: Boolean(membership) };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.slice(7));
    if (!decoded?.userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { clubId } = await context.params;
    const access = await getClubAccess(decoded.userId, clubId);
    if (!access.isClubAdmin && !access.isClubMember) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const type = request.nextUrl.searchParams.get('type') ?? 'all';
    const detail = request.nextUrl.searchParams.get('detail') ?? 'summary';

    const viewerUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        userType: true,
        country: true,
        settings: { select: { language: true } },
        mainSports: { select: { sport: true } },
      },
    });
    const viewer = {
      userType: viewerUser?.userType ?? '',
      country: viewerUser?.country ?? null,
      languageCode: (viewerUser?.settings?.language ?? 'en').slice(0, 2).toLowerCase() || 'en',
      sports: (viewerUser?.mainSports ?? []).map((s) => s.sport),
    };

    /** Full ArticlePasted-compatible payload for Club News → OGP News UI. */
    if (detail === 'full' && type === 'ogp') {
      const ogpShares = await prisma.clubSharedOgpArticle.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
        include: {
          ogpArticle: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  country: true,
                  userType: true,
                },
              },
            },
          },
        },
      });

      const articles = ogpShares
        .filter((row) => !row.ogpArticle.deletedAt)
        .filter((row) => {
          const a = row.ogpArticle;
          return canViewerSeeClubSharedOgp({
            audienceMode: row.audienceMode,
            isClubAdmin: access.isClubAdmin,
            isClubMember: access.isClubMember,
            viewer,
            visibility: {
              userTypes: parseJsonStringArray(a.visibilityUserTypes),
              countries: parseJsonStringArray(a.visibilityCountries),
              languages: parseJsonStringArray(a.visibilityLanguages),
              sports: parseJsonStringArray(a.visibilitySports),
              expiresAt: a.expiresAt,
            },
          });
        })
        .map((row) => {
          const a = row.ogpArticle;
          return {
            id: a.id,
            userId: a.userId,
            creatorUsername: a.user?.username ?? null,
            creatorCountry: a.user?.country ?? null,
            createdByCurrentUser: a.userId === decoded.userId,
            createdBySuperAdmin: a.user?.userType === 'ADMIN',
            title: a.title,
            image: a.image,
            description: a.description,
            url: a.url,
            siteName: a.siteName,
            type: a.type,
            customDescription: a.customDescription,
            topic: a.topic,
            languageCode: a.languageCode ?? undefined,
            savedAt: a.savedAt.toISOString(),
            inGlobalNews: a.inGlobalNews === true,
            inClubGlobalNews: row.inClubGlobalNews === true,
            clubAudienceMode: row.audienceMode,
            deletedAt: a.deletedAt?.toISOString() ?? null,
            deletedByUserId: a.deletedByUserId,
            visibilityUserTypes: parseJsonStringArray(a.visibilityUserTypes),
            visibilityCountries: parseJsonStringArray(a.visibilityCountries),
            visibilityLanguages: parseJsonStringArray(a.visibilityLanguages),
            visibilitySports: parseJsonStringArray(a.visibilitySports),
            expiresAt: a.expiresAt?.toISOString() ?? null,
            sharedAt: row.createdAt.toISOString(),
            sharedClubIds: [clubId],
          };
        });

      const ogpGroupShares = await prisma.clubSharedOgpGroup.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
        include: {
          ogpNewsGroup: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  name: true,
                  country: true,
                  userType: true,
                },
              },
              items: {
                orderBy: [{ sortOrder: 'asc' }, { addedAt: 'asc' }],
                include: {
                  ogpArticle: {
                    include: {
                      user: { select: { username: true, country: true } },
                    },
                  },
                },
              },
            },
          },
        },
      });

      const groups = ogpGroupShares
        .filter((row) => !row.ogpNewsGroup.deletedAt)
        .filter((row) => {
          const g = row.ogpNewsGroup;
          return canViewerSeeClubSharedOgp({
            audienceMode: row.audienceMode,
            isClubAdmin: access.isClubAdmin,
            isClubMember: access.isClubMember,
            viewer,
            visibility: {
              userTypes: parseJsonStringArray(g.visibilityUserTypes),
              countries: parseJsonStringArray(g.visibilityCountries),
              languages: parseJsonStringArray(g.visibilityLanguages),
              sports: parseJsonStringArray(g.visibilitySports),
              expiresAt: g.expiresAt,
            },
          });
        })
        .map((row) => {
          const g = row.ogpNewsGroup;
          const sortedItems = [...g.items].sort(
            (a, b) => a.sortOrder - b.sortOrder || a.addedAt.getTime() - b.addedAt.getTime(),
          );
          const first = sortedItems[0]?.ogpArticle ?? null;
          const creatorName =
            (g.user?.name && g.user.name.trim()) || g.user?.username || null;

          return {
            id: g.id,
            userId: g.userId,
            name: g.name,
            topic: g.topic,
            savedAt: g.savedAt.toISOString(),
            memberCount: sortedItems.length,
            memberIds: sortedItems.map((i) => i.ogpArticleId),
            creatorUsername: g.user?.username ?? null,
            creatorName,
            creatorCountry: g.user?.country ?? null,
            createdByCurrentUser: g.userId === decoded.userId,
            customDescription: g.customDescription ?? first?.customDescription ?? null,
            coverImage: g.coverImage ?? null,
            deletedAt: g.deletedAt?.toISOString() ?? null,
            visibilityUserTypes: parseJsonStringArray(g.visibilityUserTypes),
            visibilityCountries: parseJsonStringArray(g.visibilityCountries),
            visibilityLanguages: parseJsonStringArray(g.visibilityLanguages),
            visibilitySports: parseJsonStringArray(g.visibilitySports),
            expiresAt: g.expiresAt?.toISOString() ?? null,
            audienceMode: row.audienceMode,
            clubAudienceMode: row.audienceMode,
            inClubGlobalNews: row.inClubGlobalNews === true,
            title: first?.title ?? g.name,
            image: g.coverImage ?? first?.image ?? null,
            description: first?.description ?? null,
            url: first?.url ?? '',
            siteName: first?.siteName ?? null,
            type: first?.type ?? null,
            previewTopic: first?.topic ?? g.topic,
            previewCreatorUsername: first?.user?.username ?? g.user?.username ?? null,
            sharedAt: row.createdAt.toISOString(),
            sharedClubIds: [clubId],
          };
        });

      return NextResponse.json({ articles, groups, items: articles });
    }

    /** Full NewsList-compatible payload for the Club News → News archive UI. */
    if (detail === 'full' && type === 'news') {
      const newsShares = await prisma.clubSharedNews.findMany({
        where: { clubId },
        orderBy: { createdAt: 'desc' },
        include: {
          news: {
            include: {
              category: {
                select: { id: true, categoryName: true },
              },
              languageTitles: {
                include: {
                  language: {
                    select: { id: true, code: true, name: true },
                  },
                },
              },
              settings: {
                include: {
                  sports: { select: { sport: true } },
                  roles: { select: { role: true } },
                  languages: {
                    include: { language: { select: { code: true } } },
                  },
                  countries: { select: { countryCode: true } },
                },
              },
            },
          },
        },
      });

      const userIds = newsShares
        .filter((row) =>
          canViewerSeeClubSharedOgp({
            audienceMode: row.audienceMode,
            isClubAdmin: access.isClubAdmin,
            isClubMember: access.isClubMember,
            viewer,
            visibility: newsSettingsToClubVisibility(row.news.settings, row.news.createdAt),
          }),
        )
        .map((row) => row.news.userId)
        .filter((id): id is string => id !== null);

      const usersMap = new Map<
        string,
        { id: string; username: string; image: string | null; firstname: string | null; lastname: string | null }
      >();

      if (userIds.length > 0) {
        const users = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, username: true, firstName: true, surname: true },
        });
        users.forEach((u) => {
          usersMap.set(u.id, {
            id: u.id,
            username: u.username,
            image: null,
            firstname: u.firstName || null,
            lastname: u.surname || null,
          });
        });
      }

      const news = newsShares
        .filter((row) =>
          canViewerSeeClubSharedOgp({
            audienceMode: row.audienceMode,
            isClubAdmin: access.isClubAdmin,
            isClubMember: access.isClubMember,
            viewer,
            visibility: newsSettingsToClubVisibility(row.news.settings, row.news.createdAt),
          }),
        )
        .map((row) => {
        const item = row.news;
        let deserializedContent: Record<string, string> = {};
        if (item.content) {
          try {
            deserializedContent = deserializeMultiLanguageContent(item.content);
          } catch {
            deserializedContent = {};
          }
        }
        const userData = item.userId ? usersMap.get(item.userId) ?? null : null;
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
          category: item.category
            ? { id: item.category.id, categoryName: item.category.categoryName }
            : null,
          languageTitles: item.languageTitles.map((lt) => ({
            title: lt.title,
            language: { code: lt.language.code, name: lt.language.name },
          })),
          settings: item.settings.map((s) => ({
            sports: s.sports.map((sp) => ({ sport: sp.sport })),
          })),
          user: userData
            ? {
                id: userData.id,
                username: userData.username,
                image: userData.image,
                firstname: userData.firstname,
                lastname: userData.lastname,
              }
            : null,
          sharedAt: row.createdAt.toISOString(),
          sharedClubIds: [clubId],
          inClubGlobalNews: row.inClubGlobalNews === true,
          clubAudienceMode: row.audienceMode,
        };
      });

      return NextResponse.json({ news, items: news });
    }

    const items: ClubSharedFeedItem[] = [];
    /** Club Global News (type=all) only includes items promoted via the globe toggle. */
    const globalOnly = type === 'all';
    const shareWhere = globalOnly
      ? { clubId, inClubGlobalNews: true }
      : { clubId };

    if (type === 'all' || type === 'news') {
      const newsShares = await prisma.clubSharedNews.findMany({
        where: shareWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          news: {
            select: {
              id: true,
              title: true,
              date: true,
              author: true,
              originalAuthor: true,
              method: true,
              image: true,
              briefDesc: true,
              internetLink: true,
              category: { select: { categoryName: true } },
            },
          },
        },
      });
      for (const row of newsShares) {
        items.push({
          kind: 'news',
          id: row.news.id,
          shareId: row.id,
          title: row.news.title,
          date: row.news.date.toISOString(),
          author: row.news.author ?? row.news.originalAuthor,
          categoryName: row.news.category?.categoryName ?? null,
          method: row.news.method,
          image: row.news.image,
          briefDesc: row.news.briefDesc,
          internetLink: row.news.internetLink,
          sharedAt: row.createdAt.toISOString(),
          inClubGlobalNews: row.inClubGlobalNews === true,
        });
      }
    }

    if (type === 'all' || type === 'ogp') {
      const ogpShares = await prisma.clubSharedOgpArticle.findMany({
        where: shareWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          ogpArticle: {
            select: {
              id: true,
              title: true,
              savedAt: true,
              topic: true,
              image: true,
              url: true,
              description: true,
              customDescription: true,
              deletedAt: true,
              visibilityUserTypes: true,
              visibilityCountries: true,
              visibilityLanguages: true,
              visibilitySports: true,
              expiresAt: true,
              user: { select: { username: true } },
            },
          },
        },
      });
      for (const row of ogpShares) {
        if (row.ogpArticle.deletedAt) continue;
        const a = row.ogpArticle;
        if (
          !canViewerSeeClubSharedOgp({
            audienceMode: row.audienceMode,
            isClubAdmin: access.isClubAdmin,
            isClubMember: access.isClubMember,
            viewer,
            visibility: {
              userTypes: parseJsonStringArray(a.visibilityUserTypes),
              countries: parseJsonStringArray(a.visibilityCountries),
              languages: parseJsonStringArray(a.visibilityLanguages),
              sports: parseJsonStringArray(a.visibilitySports),
              expiresAt: a.expiresAt,
            },
          })
        ) {
          continue;
        }
        items.push({
          kind: 'ogp',
          id: row.ogpArticle.id,
          shareId: row.id,
          title: row.ogpArticle.title,
          date: row.ogpArticle.savedAt.toISOString(),
          topic: row.ogpArticle.topic,
          creatorUsername: row.ogpArticle.user?.username ?? null,
          image: row.ogpArticle.image,
          url: row.ogpArticle.url,
          description: row.ogpArticle.description,
          customDescription: row.ogpArticle.customDescription,
          sharedAt: row.createdAt.toISOString(),
          inClubGlobalNews: row.inClubGlobalNews === true,
        });
      }
    }

    if (type === 'all' || type === 'ogp') {
      const ogpGroupShares = await prisma.clubSharedOgpGroup.findMany({
        where: shareWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          ogpNewsGroup: {
            select: {
              id: true,
              name: true,
              topic: true,
              savedAt: true,
              coverImage: true,
              customDescription: true,
              deletedAt: true,
              visibilityUserTypes: true,
              visibilityCountries: true,
              visibilityLanguages: true,
              visibilitySports: true,
              expiresAt: true,
              user: { select: { username: true, name: true } },
              items: {
                orderBy: [{ sortOrder: 'asc' }, { addedAt: 'asc' }],
                take: 1,
                include: {
                  ogpArticle: {
                    select: {
                      title: true,
                      image: true,
                      description: true,
                      url: true,
                      customDescription: true,
                    },
                  },
                },
              },
              _count: { select: { items: true } },
            },
          },
        },
      });
      for (const row of ogpGroupShares) {
        if (row.ogpNewsGroup.deletedAt) continue;
        const g = row.ogpNewsGroup;
        if (
          !canViewerSeeClubSharedOgp({
            audienceMode: row.audienceMode,
            isClubAdmin: access.isClubAdmin,
            isClubMember: access.isClubMember,
            viewer,
            visibility: {
              userTypes: parseJsonStringArray(g.visibilityUserTypes),
              countries: parseJsonStringArray(g.visibilityCountries),
              languages: parseJsonStringArray(g.visibilityLanguages),
              sports: parseJsonStringArray(g.visibilitySports),
              expiresAt: g.expiresAt,
            },
          })
        ) {
          continue;
        }
        const first = g.items[0]?.ogpArticle ?? null;
        items.push({
          kind: 'ogp-group',
          id: g.id,
          shareId: row.id,
          title: first?.title ?? g.name,
          date: g.savedAt.toISOString(),
          topic: g.topic,
          creatorUsername: g.user?.username ?? null,
          image: g.coverImage ?? first?.image ?? null,
          url: first?.url ?? '',
          description: first?.description ?? null,
          customDescription: g.customDescription ?? first?.customDescription ?? null,
          memberCount: g._count.items,
          sharedAt: row.createdAt.toISOString(),
          inClubGlobalNews: row.inClubGlobalNews === true,
        });
      }
    }

    // Club Global News: chronological by article date (like admin Global News).
    // Other feeds: by when shared into the club.
    items.sort((a, b) =>
      globalOnly
        ? new Date(b.date).getTime() - new Date(a.date).getTime()
        : new Date(b.sharedAt).getTime() - new Date(a.sharedAt).getTime(),
    );

    return NextResponse.json({ items, isClubAdmin: access.isClubAdmin });
  } catch (error) {
    console.error('Fetch club shared news:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
