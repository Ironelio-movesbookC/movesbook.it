import { notFound } from 'next/navigation';
import type { UserType } from '@prisma/client';
import ModernNavbar from '@/components/ModernNavbar';
import { SearchResultClubWallClient } from '@/components/searchresults/SearchResultClubWallClient';
import { SearchResultTeamGroupWallClient } from '@/components/searchresults/SearchResultTeamGroupWallClient';
import { SearchResultUserWallClient } from '@/components/searchresults/SearchResultUserWallClient';
import { resolveSearchResultsSlug } from '@/lib/searchresultsResolve';

export const dynamic = 'force-dynamic';

function titleCaseUserType(ut: UserType): string {
  return ut
    .split('_')
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');
}

function ageFromBirthdate(b: Date | null): string | null {
  if (!b) return null;
  const d = new Date(b);
  if (Number.isNaN(d.getTime())) return null;
  let age = new Date().getFullYear() - d.getFullYear();
  const m = new Date().getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && new Date().getDate() < d.getDate())) age--;
  return age >= 0 ? String(age) : null;
}

export default async function SearchResultsSearchPage({
  params,
}: {
  params: { slug: string };
}) {
  let slug = params.slug;
  try {
    slug = decodeURIComponent(params.slug);
  } catch {
    slug = params.slug;
  }

  const resolved = await resolveSearchResultsSlug(slug);
  if (!resolved) notFound();

  if (resolved.kind === 'user') {
    const u = resolved.user;
    const sportsLine = u.mainSports.map((m) => String(m.sport).replace(/_/g, ' ')).join(', ');
    const selfPath = `/searchresults/search/${encodeURIComponent(u.username)}`;
    return (
      <div className="flex min-h-screen flex-col bg-zinc-100">
        <ModernNavbar />
        <SearchResultUserWallClient
          data={{
            selfPath,
            username: u.username,
            displayName: u.name,
            country: u.country,
            image: u.image,
            sportsLine,
            userTypeLabel: titleCaseUserType(u.userType),
            ageLabel: ageFromBirthdate(u.birthdate),
            bannerProfile: {
              image: u.image,
              profileBanner: u.profileBanner,
              profileBannerAlignment: u.profileBannerAlignment,
              profileBannerSequence: u.profileBannerSequence,
              profileBannerVideo: u.profileBannerVideo,
            },
          }}
        />
      </div>
    );
  }

  if (resolved.kind === 'club') {
    const c = resolved.club;
    const selfPath = `/searchresults/search/${encodeURIComponent(c.name)}`;
    const adm = c.admin;
    return (
      <div className="flex min-h-screen flex-col bg-zinc-100">
        <ModernNavbar />
        <SearchResultClubWallClient
          data={{
            selfPath,
            clubName: c.name,
            description: c.description,
            location: c.location,
            adminDisplayName: adm.name,
            adminCountry: adm.country,
            adminImage: adm.image,
            bannerProfile: {
              image: adm.image,
              profileBanner: adm.profileBanner,
              profileBannerAlignment: adm.profileBannerAlignment,
              profileBannerSequence: adm.profileBannerSequence,
              profileBannerVideo: adm.profileBannerVideo,
            },
          }}
        />
      </div>
    );
  }

  if (resolved.kind === 'team') {
    const tm = resolved.team;
    const sub = [tm.sport, tm.description].filter(Boolean).join(' · ');
    return (
      <div className="flex min-h-screen flex-col bg-zinc-100">
        <ModernNavbar />
        <SearchResultTeamGroupWallClient
          data={{ kind: 'team', name: tm.name, subtitle: sub || null }}
        />
      </div>
    );
  }

  const g = resolved.group;
  return (
    <div className="flex min-h-screen flex-col bg-zinc-100">
      <ModernNavbar />
      <SearchResultTeamGroupWallClient
        data={{ kind: 'group', name: g.name, subtitle: g.description }}
      />
    </div>
  );
}
