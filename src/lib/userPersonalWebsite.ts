import { prisma } from '@/lib/prisma';
import { normalizePersonalWebsiteUrl } from '@/lib/normalizePersonalWebsiteUrl';

export { normalizePersonalWebsiteUrl };

/** Stored under `UserSettings.socialSettings` (JSON), same key as operator “My Website”. */
export const PERSONAL_WEBSITE_SOCIAL_KEY = 'website';

const SOCIAL_WEBSITE_KEYS = [
  PERSONAL_WEBSITE_SOCIAL_KEY,
  'myWebsite',
  'personalWebsite',
  'site',
] as const;

function websiteFromSocialSettings(socialSettingsJson: string | null | undefined): string | null {
  if (!socialSettingsJson?.trim()) return null;
  try {
    const parsed = JSON.parse(socialSettingsJson) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const o = parsed as Record<string, unknown>;
    for (const key of SOCIAL_WEBSITE_KEYS) {
      const raw = o[key];
      if (typeof raw === 'string' && raw.trim()) return raw.trim();
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Personal website from `user_settings.socialSettings` (e.g. `"website": "https://…"`).
 */
export async function getUserPersonalWebsite(userId: string): Promise<string | null> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId },
    select: { socialSettings: true },
  });

  return websiteFromSocialSettings(settings?.socialSettings);
}

export async function getUserPersonalWebsiteHref(userId: string): Promise<string | null> {
  const raw = await getUserPersonalWebsite(userId);
  if (!raw) return null;
  return normalizePersonalWebsiteUrl(raw);
}
