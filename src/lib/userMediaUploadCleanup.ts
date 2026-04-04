import { readdir, unlink } from 'fs/promises';
import { join, normalize, relative } from 'path';
import { parseBannerSequenceJson } from '@/lib/profileBannerSequence';
import { getServerPublicDir } from '@/lib/serverPublicDir';

/** Matches filename prefixes used in avatar/banner/banner-video upload routes. */
export function userMediaFilenamePrefix(userId: string): string {
  return userId.slice(0, 8);
}

/** Public paths under `public/uploads` that we own and may delete. */
export function collectReferencedUploadPaths(row: {
  image?: string | null;
  profileBanner?: string | null;
  profileBannerSequence?: string | null;
  profileBannerVideo?: string | null;
}): Set<string> {
  const out = new Set<string>();
  const add = (p: string | null | undefined) => {
    if (!p?.trim()) return;
    const t = p.trim();
    if (
      t.startsWith('/uploads/profile_avatars/') ||
      t.startsWith('/uploads/profile_banners/') ||
      t.startsWith('/uploads/profile_banner_videos/')
    ) {
      out.add(t);
    }
  };
  add(row.image);
  add(row.profileBanner);
  add(row.profileBannerVideo);
  for (const p of parseBannerSequenceJson(row.profileBannerSequence)) {
    add(p);
  }
  return out;
}

function absolutePathForPublicUpload(publicPath: string): string | null {
  if (!publicPath.startsWith('/uploads/')) return null;
  const rel = publicPath.replace(/^\//, '');
  const abs = normalize(join(getServerPublicDir(), rel));
  const root = normalize(join(getServerPublicDir(), 'uploads'));
  const fromRoot = relative(root, abs);
  if (fromRoot.startsWith('..') || fromRoot === '') return null;
  return abs;
}

/**
 * Deletes files in managed dirs that match this user's upload naming pattern
 * but are not listed in `keepPaths` (current DB references).
 * Covers sequence orphans and switching single / video / sequence modes.
 */
export async function deleteUnreferencedUserMediaFiles(
  userId: string,
  keepPaths: Set<string>,
): Promise<void> {
  const prefix = userMediaFilenamePrefix(userId);
  const specs = [
    { dir: 'profile_avatars' as const, filePrefix: `avatar_${prefix}_` },
    { dir: 'profile_banners' as const, filePrefix: `banner_${prefix}_` },
    { dir: 'profile_banner_videos' as const, filePrefix: `banner_video_${prefix}_` },
  ];

  for (const { dir, filePrefix } of specs) {
    const uploadDir = join(getServerPublicDir(), 'uploads', dir);
    let names: string[] = [];
    try {
      names = await readdir(uploadDir);
    } catch {
      continue;
    }
    for (const name of names) {
      if (!name.startsWith(filePrefix)) continue;
      const pub = `/uploads/${dir}/${name}`;
      if (keepPaths.has(pub)) continue;
      const abs = absolutePathForPublicUpload(pub);
      if (!abs) continue;
      try {
        await unlink(abs);
      } catch {
        /* ignore missing or permission */
      }
    }
  }
}

/** Remove all files for this user in one uploads subfolder (before writing the new file). */
export async function deleteAllUserFilesInManagedDir(
  dir: 'profile_avatars' | 'profile_banners' | 'profile_banner_videos',
  filePrefix: string,
): Promise<void> {
  const uploadDir = join(getServerPublicDir(), 'uploads', dir);
  let names: string[] = [];
  try {
    names = await readdir(uploadDir);
  } catch {
    return;
  }
  for (const name of names) {
    if (!name.startsWith(filePrefix)) continue;
    const abs = absolutePathForPublicUpload(`/uploads/${dir}/${name}`);
    if (!abs) continue;
    try {
      await unlink(abs);
    } catch {
      /* ignore */
    }
  }
}
