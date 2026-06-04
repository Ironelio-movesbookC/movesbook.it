import { prisma } from '@/lib/prisma';
import {
  mergeClubAdminInfoIntoSocialSettings,
  parseClubAdminInfo,
  readClubAdminInfoFromSocialSettings,
  type ClubAdminInfo,
} from '@/lib/club/clubAdminInfo';

function safeJsonParse(jsonString: string | null | undefined): Record<string, unknown> {
  if (!jsonString?.trim()) return {};
  try {
    const parsed = JSON.parse(jsonString);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function getUserYoutubeChannelUrl(userId: string): Promise<string | null> {
  const rows = await prisma.$queryRaw<{ youtubeChannelUrl: string | null }[]>`
    SELECT youtubeChannelUrl
    FROM users_new
    WHERE id = ${userId}
    LIMIT 1
  `;
  return rows[0]?.youtubeChannelUrl ?? null;
}

async function setUserYoutubeChannelUrl(userId: string, value: string | null): Promise<void> {
  await prisma.$executeRaw`
    UPDATE users_new
    SET youtubeChannelUrl = ${value}
    WHERE id = ${userId}
  `;
}

const USER_SETTINGS_CREATE_DEFAULTS = {
  colorSettings: '{}',
  widgetArrangement: '[]',
  toolsSettings: '{}',
  favouritesSettings: '{}',
  myBestSettings: '{}',
  adminSettings: '{}',
  workoutPreferences: '{}',
  socialSettings: '{}',
  notificationSettings: '{}',
};

async function readSocialSettings(userId: string): Promise<Record<string, unknown>> {
  const row = await prisma.userSettings.findUnique({
    where: { userId },
    select: { socialSettings: true },
  });
  return safeJsonParse(row?.socialSettings);
}

async function writeSocialSettings(
  userId: string,
  socialSettings: Record<string, unknown>,
): Promise<void> {
  const payload = JSON.stringify(socialSettings);
  await prisma.userSettings.upsert({
    where: { userId },
    update: { socialSettings: payload },
    create: {
      userId,
      ...USER_SETTINGS_CREATE_DEFAULTS,
      socialSettings: payload,
    },
  });
}

export async function loadClubAdminInfoForUser(userId: string): Promise<{
  clubAdminInfo: ClubAdminInfo;
  youtubeChannelUrl: string | null;
}> {
  const social = await readSocialSettings(userId);
  const clubAdminInfo = readClubAdminInfoFromSocialSettings(social);
  const youtubeChannelUrl = await getUserYoutubeChannelUrl(userId);
  if (youtubeChannelUrl?.trim() && !clubAdminInfo.youtube.url.trim()) {
    clubAdminInfo.youtube = { ...clubAdminInfo.youtube, url: youtubeChannelUrl.trim() };
  }
  return { clubAdminInfo, youtubeChannelUrl };
}

export async function saveClubAdminInfoForUser(
  userId: string,
  raw: unknown,
  options?: { youtubeChannelUrl?: string | null },
): Promise<ClubAdminInfo> {
  const clubAdminInfo = parseClubAdminInfo(raw);
  const social = await readSocialSettings(userId);
  const mergedSocial = mergeClubAdminInfoIntoSocialSettings(social, clubAdminInfo);
  await writeSocialSettings(userId, mergedSocial);

  if (options && Object.prototype.hasOwnProperty.call(options, 'youtubeChannelUrl')) {
    const trimmed = String(options.youtubeChannelUrl ?? '').trim();
    await setUserYoutubeChannelUrl(userId, trimmed.length > 0 ? trimmed : null);
  }

  return clubAdminInfo;
}
