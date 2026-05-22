import { prisma } from '@/lib/prisma';

/** Stored under `UserSettings.socialSettings` (JSON), same key as operator “My Website”. */
export const PERSONAL_WEBSITE_SOCIAL_KEY = 'website';

const SOCIAL_WEBSITE_KEYS = [
  PERSONAL_WEBSITE_SOCIAL_KEY,
  'myWebsite',
  'personalWebsite',
  'site',
] as const;

function stripWrappingQuotes(s: string): string {
  let v = s.trim().replace(/^\uFEFF/, '');
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v;
}

/**
 * Returns a safe http(s) URL to open in a new tab, or null if invalid / empty.
 */
export function normalizePersonalWebsiteUrl(raw: string): string | null {
  let v = stripWrappingQuotes(raw);
  if (!v) return null;
  v = v.replace(/\u00a0/g, ' ').trim();
  const collapsed = v.replace(/\s+/g, '');
  if (!collapsed) return null;

  let candidate = collapsed;
  if (!/^https?:\/\//i.test(candidate) && !/^\/\//.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`;
  } else if (/^\/\//.test(candidate)) {
    candidate = `https:${candidate}`;
  }

  try {
    const u = new URL(candidate);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
    return u.href;
  } catch {
    return null;
  }
}

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
