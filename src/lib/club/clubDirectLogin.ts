import { hashPassword, verifyPassword } from '@/lib/auth';
import { parseClubDescriptionMeta } from '@/lib/club/clubSidebarLabel';

export type ClubDirectLoginMatch = {
  clubId: string;
  adminId: string;
};

/** Find a form-created club whose company username matches the login identifier. */
export function findClubByCompanyUsername(
  clubs: { id: string; adminId: string; description: string | null }[],
  loginIdentifier: string,
): ClubDirectLoginMatch | null {
  const needle = loginIdentifier.trim().toLowerCase();
  if (!needle) return null;

  for (const club of clubs) {
    const meta = parseClubDescriptionMeta(club.description);
    const username = meta.username?.trim().toLowerCase();
    if (username && username === needle) {
      return { clubId: club.id, adminId: club.adminId };
    }
  }
  return null;
}

export async function hashClubCompanyPassword(password: string): Promise<string> {
  return hashPassword(password.trim());
}

export async function verifyClubCompanyPassword(
  password: string,
  storedHash: string | undefined,
): Promise<boolean> {
  if (!storedHash?.trim()) return false;
  return verifyPassword(password, storedHash.trim());
}
