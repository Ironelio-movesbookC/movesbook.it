import type { ClubAdminInfo } from '@/lib/club/clubAdminInfo';

export const CLUB_SOCIAL_SITE_ROW_IDS = [
  'social-twitter',
  'social-instagram',
  'social-youtube',
  'social-linkedin',
  'social-telegram',
  'social-whatsapp',
  'social-blog',
] as const;

export type ClubSocialSiteRowId = (typeof CLUB_SOCIAL_SITE_ROW_IDS)[number];

function toExternalHref(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function urlFromSocialSites(info: ClubAdminInfo, platformPattern: RegExp): string {
  for (const site of info.socialSites) {
    if (platformPattern.test(site.platform) && site.url.trim()) {
      return toExternalHref(site.url);
    }
  }
  return '';
}

/**
 * Resolve launch URL for Website editor Social sites rows from Club Admin Info
 * (Contact Info / Admin Profile on my-club).
 */
export function resolveClubSocialSiteLaunchUrl(
  info: ClubAdminInfo | null | undefined,
  socialRowId: string
): string {
  if (!info) return '';

  switch (socialRowId) {
    case 'social-twitter':
      return urlFromSocialSites(info, /twitter|\bx\b/i);
    case 'social-instagram':
      return toExternalHref(info.instagram.url) || urlFromSocialSites(info, /instagram/i);
    case 'social-youtube':
      return toExternalHref(info.youtube.url) || urlFromSocialSites(info, /youtube/i);
    case 'social-linkedin':
      return toExternalHref(info.linkedin.url) || urlFromSocialSites(info, /linkedin/i);
    case 'social-telegram':
      return urlFromSocialSites(info, /telegram/i);
    case 'social-whatsapp':
      return toExternalHref(info.whatsapp.url) || urlFromSocialSites(info, /whatsapp/i);
    case 'social-blog':
      return toExternalHref(info.blogSite.url) || urlFromSocialSites(info, /blog/i);
    default:
      return '';
  }
}

export function buildClubSocialSiteLaunchUrls(
  info: ClubAdminInfo | null | undefined
): Record<string, string> {
  const urls: Record<string, string> = {};
  for (const id of CLUB_SOCIAL_SITE_ROW_IDS) {
    const href = resolveClubSocialSiteLaunchUrl(info, id);
    if (href) urls[id] = href;
  }
  return urls;
}
