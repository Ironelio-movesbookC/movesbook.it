import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthWithUser, requireAuthForNews } from '../auth';

function parseJsonArray(str: string | null | undefined): string[] {
  if (str == null || str === '') return [];
  try {
    const a = JSON.parse(str);
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, userType, country, isAdmin } = auth;
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic');

  try {
    const where: { topic?: string; deletedAt?: null } = isAdmin ? {} : { deletedAt: null };
    if (topic != null && topic !== '') where.topic = topic;

    const list = (await prisma.ogpArticle.findMany({
      where,
      orderBy: { savedAt: 'desc' },
      include: {
        deletedBy: { select: { name: true, username: true } },
      } as never,
    })) as Array<
      Awaited<ReturnType<typeof prisma.ogpArticle.findMany>>[number] & {
        deletedByUserId: string | null;
        deletedBy: { name: string | null; username: string } | null;
      }
    >;

    let userSports: string[] = [];
    if (!isAdmin) {
      const sportsRows = await prisma.userMainSport.findMany({
        where: { userId },
        select: { sport: true },
      });
      userSports = sportsRows.map((s) => s.sport);
    }

    const now = new Date();
    const filtered = list.filter((a) => {
      if (a.deletedAt) {
        if (isAdmin) return true;
        return false;
      }
      if (isAdmin) return true;
      if (a.userId === userId) return true;
      if (a.expiresAt && a.expiresAt < now) return false;
      const vUserTypes = parseJsonArray(a.visibilityUserTypes);
      const vCountries = parseJsonArray(a.visibilityCountries);
      const vLanguages = parseJsonArray(a.visibilityLanguages);
      const vSports = parseJsonArray(a.visibilitySports);
      // If creator didn't set any visibility, show to everyone (default public)
      const hasNoVisibilitySet =
        vUserTypes.length === 0 &&
        vCountries.length === 0 &&
        vLanguages.length === 0 &&
        vSports.length === 0 &&
        !a.expiresAt;
      if (hasNoVisibilitySet) return true;
      if (vUserTypes.length > 0 && !vUserTypes.includes(userType)) return false;
      if (vCountries.length > 0 && !vCountries.includes(country ?? '')) return false;
      if (vLanguages.length > 0) {
        const userLang = (request.headers.get('accept-language') || 'en').slice(0, 2).toLowerCase();
        if (!vLanguages.some((l: string) => l.toLowerCase() === userLang)) return false;
      }
      if (vSports.length > 0 && !vSports.some((s: string) => userSports.includes(s))) return false;
      return true;
    });

    const articles = filtered.map((a) => ({
      id: a.id,
      userId: a.userId,
      title: a.title,
      image: a.image,
      description: a.description,
      url: a.url,
      siteName: a.siteName,
      type: a.type,
      customDescription: a.customDescription,
      topic: a.topic,
      languageCode: a.languageCode ?? null,
      savedAt: a.savedAt.toISOString(),
      visibilityUserTypes: parseJsonArray(a.visibilityUserTypes),
      visibilityCountries: parseJsonArray(a.visibilityCountries),
      visibilityLanguages: parseJsonArray(a.visibilityLanguages),
      visibilitySports: parseJsonArray(a.visibilitySports),
      expiresAt: a.expiresAt?.toISOString() ?? null,
      ...(a.deletedAt && {
        deletedAt: a.deletedAt.toISOString(),
        deletedByUserId: a.deletedByUserId ?? undefined,
        deletedByName: a.deletedBy ? (a.deletedBy.name || a.deletedBy.username) : undefined,
      }),
    }));
    return NextResponse.json(articles);
  } catch (e) {
    console.error('GET /api/news/ogp', e);
    return NextResponse.json({ error: 'Failed to load articles' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthForNews(request);
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
      languageCode,
      expiresAt,
      visibilityUserTypes,
      visibilityCountries,
      visibilityLanguages,
      visibilitySports,
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
        languageCode: typeof languageCode === 'string' && languageCode.trim() ? languageCode.trim() : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        visibilityUserTypes: Array.isArray(visibilityUserTypes) ? JSON.stringify(visibilityUserTypes) : null,
        visibilityCountries: Array.isArray(visibilityCountries) ? JSON.stringify(visibilityCountries) : null,
        visibilityLanguages: Array.isArray(visibilityLanguages) ? JSON.stringify(visibilityLanguages) : null,
        visibilitySports: Array.isArray(visibilitySports) ? JSON.stringify(visibilitySports) : null,
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
      languageCode: created.languageCode ?? null,
      savedAt: created.savedAt.toISOString(),
    });
  } catch (e) {
    console.error('POST /api/news/ogp', e);
    return NextResponse.json({ error: 'Failed to create article' }, { status: 500 });
  }
}
