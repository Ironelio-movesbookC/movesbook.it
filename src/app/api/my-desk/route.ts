import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaConnect } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { resolveWorkoutDatabaseUserId } from '@/lib/workoutUserId';

export const dynamic = 'force-dynamic';

type MyDeskRecord = {
  id: string;
  userId: string;
  parentId: string | null;
  title: string;
  path: string | null;
  faIconClass: string | null;
  bgColor: string | null;
  titleColor: string | null;
  displayMode: string | null;
  visible: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
};

type MyDeskTreeNode = MyDeskRecord & { children: MyDeskTreeNode[] };

function getTokenUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ? String(decoded.userId) : null;
}

function buildTree(rows: MyDeskRecord[]): MyDeskTreeNode[] {
  const byId = new Map<string, MyDeskTreeNode>();
  const roots: MyDeskTreeNode[] = [];

  for (const row of rows) {
    byId.set(row.id, { ...row, children: [] });
  }

  for (const row of rows) {
    const node = byId.get(row.id)!;
    if (row.parentId && byId.has(row.parentId)) {
      byId.get(row.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (nodes: MyDeskTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
    for (const child of nodes) {
      sortNodes(child.children);
    }
  };
  sortNodes(roots);
  return roots;
}

export async function GET(request: NextRequest) {
  try {
    const tokenUserId = getTokenUserId(request);
    if (!tokenUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const userId = await resolveWorkoutDatabaseUserId(tokenUserId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const items = await prisma.myDeskItem.findMany({
      where: { userId },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
    });

    return NextResponse.json({ items: buildTree(items as MyDeskRecord[]) });
  } catch (error) {
    console.error('GET /api/my-desk failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tokenUserId = getTokenUserId(request);
    if (!tokenUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prismaConnect();
    const userId = await resolveWorkoutDatabaseUserId(tokenUserId);
    if (!userId) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const body = (await request.json()) as {
      parentId?: string | null;
      title?: string;
      path?: string | null;
      faIconClass?: string | null;
      bgColor?: string | null;
      titleColor?: string | null;
      displayMode?: 'new_label' | 'central_page' | null;
      visible?: boolean;
    };

    const title = String(body.title ?? '').trim();
    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const parentId = body.parentId ? String(body.parentId) : null;
    if (parentId) {
      const parent = await prisma.myDeskItem.findFirst({
        where: { id: parentId, userId },
        select: { id: true }
      });
      if (!parent) {
        return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
      }
    }

    const maxSibling = await prisma.myDeskItem.aggregate({
      where: { userId, parentId },
      _max: { sortOrder: true }
    });
    const sortOrder = (maxSibling._max.sortOrder ?? -1) + 1;

    const item = await prisma.myDeskItem.create({
      data: {
        userId,
        parentId,
        title,
        path: body.path ? String(body.path) : null,
        faIconClass: body.faIconClass ? String(body.faIconClass) : null,
        bgColor: body.bgColor ? String(body.bgColor) : null,
        titleColor: body.titleColor ? String(body.titleColor) : null,
        displayMode: body.displayMode ? String(body.displayMode) : null,
        visible: typeof body.visible === 'boolean' ? body.visible : true,
        sortOrder
      }
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error('POST /api/my-desk failed:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
