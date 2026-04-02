import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuthForNews, requireAuthWithUser, getSuperAdminUserIds } from '../auth';

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
  const auth = await requireAuthWithUser(request);
  if (auth instanceof NextResponse) return auth;
  const { userId, isSuperAdmin } = auth;

  try {
    // Super admin: show all custom topics. Normal user: default + topics by super admins + topics by self.
    const superAdminIds = await getSuperAdminUserIds();
    const allowedUserIds = isSuperAdmin ? undefined : [...superAdminIds, userId];
    const allCustom = await prisma.userNewsTopic.findMany({
      where: isSuperAdmin ? undefined : { userId: { in: allowedUserIds } },
      orderBy: [{ name: 'asc' }, { displayOrder: 'asc' }],
      select: {
        id: true,
        name: true,
        displayOrder: true,
        userId: true,
        user: { select: { username: true } },
      },
    });
    // Distinct by name; keep one id per name (first occurrence for edit/delete).
    // Mark topic names as super-admin-created if ANY topic with that name is from a super admin (so we disable pencil even when user has same-named topic).
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
      defaultTopicNames: DEFAULT_TOPIC_NAMES,
      customTopics: custom,
      topicNamesCreatedBySuperAdmin: isSuperAdmin ? [] : topicNamesCreatedBySuperAdmin,
      topicNamesCreatedByNormalUsers: isSuperAdmin ? topicNamesCreatedByNormalUsers : [],
      userInsertedTopics: isSuperAdmin ? userInsertedTopics : [],
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
