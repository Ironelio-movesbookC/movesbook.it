import { prisma } from '@/lib/prisma';
import {
  movesbookUserNameVisibilityFromSocialSettings,
  type MovesbookUserNameVisibility,
} from '@/lib/chat/movesbookUserNameVisibility';

export async function loadMovesbookUserNameVisibilityMap(
  userIds: string[]
): Promise<Map<string, MovesbookUserNameVisibility>> {
  const map = new Map<string, MovesbookUserNameVisibility>();
  if (userIds.length === 0) return map;

  const settings = await prisma.userSettings.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, socialSettings: true },
  });

  for (const row of settings) {
    map.set(
      row.userId,
      movesbookUserNameVisibilityFromSocialSettings(row.socialSettings)
    );
  }

  return map;
}

