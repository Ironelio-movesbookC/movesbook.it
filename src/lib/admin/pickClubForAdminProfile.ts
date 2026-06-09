import {
  isClubCreatedFromForm,
  parseClubDescriptionMeta,
} from '@/lib/club/clubSidebarLabel';

export type ClubProfilePickSource = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  createdAt: Date;
};

function clubMatchesQuery(club: ClubProfilePickSource, qLower: string): boolean {
  const name = club.name?.toLowerCase() ?? '';
  const loc = club.location?.toLowerCase() ?? '';
  const desc = club.description?.toLowerCase() ?? '';
  const meta = parseClubDescriptionMeta(club.description);
  const clubUser = meta.username?.toLowerCase() ?? '';
  const direct = meta.directAccess?.toLowerCase() ?? '';
  return (
    name.includes(qLower) ||
    loc.includes(qLower) ||
    desc.includes(qLower) ||
    clubUser.includes(qLower) ||
    direct.includes(qLower)
  );
}

function newestFirst<T extends { createdAt: Date }>(clubs: T[]): T[] {
  return [...clubs].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

/**
 * Choose which owned club to show in admin PCU / overview when a user has several rows in clubs_new.
 */
export function pickClubForAdminProfile<T extends ClubProfilePickSource>(
  clubs: T[],
  opts?: { clubId?: string | null; searchQuery?: string | null },
): T | undefined {
  if (!clubs.length) return undefined;

  const clubId = opts?.clubId?.trim();
  if (clubId) {
    const byId = clubs.find((c) => c.id === clubId);
    if (byId) return byId;
  }

  const q = opts?.searchQuery?.trim().toLowerCase();
  if (q) {
    const matched = clubs.filter((c) => clubMatchesQuery(c, q));
    if (matched.length === 1) return matched[0];
    if (matched.length > 1) {
      const form = matched.filter((c) => isClubCreatedFromForm(c));
      return newestFirst(form.length ? form : matched)[0];
    }
  }

  const formCreated = clubs.filter((c) => isClubCreatedFromForm(c));
  if (formCreated.length) return newestFirst(formCreated)[0];

  return newestFirst(clubs)[0];
}
