import { prisma } from '@/lib/prisma';

export type FriendUser = {
  id: string;
  username: string;
};

const SIMULATED_FRIEND_COUNT = 3;

/** Stable pseudo-random order per viewer so the same 3 "friends" persist across requests. */
function seededShuffle<T>(items: T[], seed: string): T[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const j = hash % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Temporary stand-in until the real friends feature exists:
 * treat 3 random other Movesbook users as the current user's friends.
 */
export async function getFriendUsers(userId: string): Promise<FriendUser[]> {
  const candidates = await prisma.user.findMany({
    where: { id: { not: userId } },
    select: {
      id: true,
      username: true,
      name: true,
    },
    orderBy: { username: 'asc' },
    take: 200,
  });

  if (candidates.length === 0) return [];

  const picked = seededShuffle(candidates, userId).slice(0, SIMULATED_FRIEND_COUNT);

  return picked.map((friend) => ({
    id: friend.id,
    username: friend.username || friend.name || 'User',
  }));
}

export async function getFriendUserIds(userId: string): Promise<string[]> {
  const friends = await getFriendUsers(userId);
  return friends.map((f) => f.id);
}
