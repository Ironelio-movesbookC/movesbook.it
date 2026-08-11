import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getExerciseDefaultTopics } from '@/constants/exerciseLibrary.constants';
import { requireAuthForNews, requireAuthWithUser, getSuperAdminUserIds } from '../auth';
import { requireCategory } from '../category';

export async function GET(request: NextRequest) {
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isSuperAdmin } = auth;

  const { searchParams } = new URL(request.url);
  const category = requireCategory(searchParams.get('category'));
  if (category instanceof NextResponse) return category;

  const DEFAULT_TOPIC_NAMES = [...getExerciseDefaultTopics(category)];

  try {
    // Super admin: show all custom topics in category. Normal user: topics by super admins + self.
    const superAdminIds = await getSuperAdminUserIds();
    const allowedUserIds = isSuperAdmin ? undefined : [...superAdminIds, userId];
    const allCustom = await prisma.userExerciseTopic.findMany({
      where: {
        category,
        ...(isSuperAdmin ? {} : { userId: { in: allowedUserIds } }),
      },
      orderBy: [{ name: 'asc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        name: true,
        displayOrder: true,
        category: true,
        userId: true,
        user: { select: { username: true } },
      },
    });
    // Distinct by name; keep one id per name (first occurrence for edit/delete).
    const topicNamesCreatedBySuperAdminSet = new Set<string>();
    for (const t of allCustom) {
      if (!isSuperAdmin && superAdminIds.includes(t.userId)) topicNamesCreatedBySuperAdminSet.add(t.name);
    }
    const topicNamesCreatedBySuperAdmin = Array.from(topicNamesCreatedBySuperAdminSet);
    /** For super admin only: user-inserted topics with creator username (dropdown + headers). */
    const userInsertedTopics: { name: string; creatorUsername: string | null }[] = [];
    if (isSuperAdmin) {
      const seenNames = new Set<string>();
      for (const t of allCustom) {
        if (superAdminIds.includes(t.userId)) continue;
        if (seenNames.has(t.name)) continue;
        seenNames.add(t.name);
        userInsertedTopics.push({
          name: t.name,
          creatorUsername: t.user?.username?.trim() ? t.user.username.trim() : null,
        });
      }
      userInsertedTopics.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
    }
    const topicNamesCreatedByNormalUsers = userInsertedTopics.map((x) => x.name);
    const seen = new Set<string>();
    const custom = allCustom.filter((t) => {
      if (seen.has(t.name)) return false;
      seen.add(t.name);
      return true;
    }).map(({ userId: _u, user: _user, ...rest }) => rest);
    return NextResponse.json({
      category,
      defaultTopicNames: DEFAULT_TOPIC_NAMES,
      customTopics: custom,
      topicNamesCreatedBySuperAdmin: isSuperAdmin ? [] : topicNamesCreatedBySuperAdmin,
      topicNamesCreatedByNormalUsers: isSuperAdmin ? topicNamesCreatedByNormalUsers : [],
      userInsertedTopics: isSuperAdmin ? userInsertedTopics : [],
    });
  } catch (e) {
    console.error('GET /api/exercises/topics', e);
    return NextResponse.json({ error: 'Failed to load topics' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuthForNews(request);
  if (auth instanceof NextResponse) return auth;
  const { userId } = auth;

  try {
    const body = await request.json();
    const category = requireCategory(body.category);
    if (category instanceof NextResponse) return category;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) {
      return NextResponse.json({ error: 'Topic name is required' }, { status: 400 });
    }
    const count = await prisma.userExerciseTopic.count({ where: { userId, category } });
    const created = await prisma.userExerciseTopic.create({
      data: { userId, category, name, displayOrder: count },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    if (e?.code === 'P2002') {
      return NextResponse.json({ error: 'A topic with this name already exists' }, { status: 409 });
    }
    console.error('POST /api/exercises/topics', e);
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 });
  }
}
