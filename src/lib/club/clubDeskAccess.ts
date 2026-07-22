import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import type { NextRequest } from 'next/server';

export type ClubDeskRecord = {
  id: string;
  clubId: string;
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

export type ClubDeskTreeNode = ClubDeskRecord & { children: ClubDeskTreeNode[] };

export function getTokenUserId(request: NextRequest): string | null {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const decoded = verifyToken(token);
  return decoded?.userId ? String(decoded.userId) : null;
}

export function buildClubDeskTree(rows: ClubDeskRecord[]): ClubDeskTreeNode[] {
  const byId = new Map<string, ClubDeskTreeNode>();
  const roots: ClubDeskTreeNode[] = [];

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

  const sortNodes = (nodes: ClubDeskTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
    for (const child of nodes) {
      sortNodes(child.children);
    }
  };
  sortNodes(roots);
  return roots;
}

/** True when the user is the club's admin (can manage Club Desk). */
export async function userIsClubAdmin(
  userId: string,
  clubId: string
): Promise<boolean> {
  const club = await prisma.club.findFirst({
    where: { id: clubId, adminId: userId },
    select: { id: true },
  });
  return Boolean(club);
}

/**
 * Club Desk list: club admin, or a member of the club.
 * Settings mutations still require admin via `userIsClubAdmin`.
 */
export async function userCanViewClubDesk(
  userId: string,
  clubId: string
): Promise<boolean> {
  if (await userIsClubAdmin(userId, clubId)) return true;
  const member = await prisma.clubMember.findFirst({
    where: { clubId, memberId: userId },
    select: { id: true },
  });
  return Boolean(member);
}
