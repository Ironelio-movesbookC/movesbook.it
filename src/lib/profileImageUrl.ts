import { toMediaApiPath } from '@/lib/uploadMediaUrl';

function managedUploadSubdir(filename: string): string | null {
  if (filename.startsWith('avatar_')) return 'profile_avatars';
  if (filename.startsWith('banner_video_')) return 'profile_banner_videos';
  if (filename.startsWith('banner_')) return 'profile_banners';
  return null;
}

/** Resolve `users_new.image` (or legacy filename) to a browser-usable URL. */
export function resolvePublicImageUrl(path: string | null | undefined): string | null {
  if (!path?.trim()) return null;

  let p = path.trim().replace(/\\/g, '/');
  if (/^(https?:|data:)/i.test(p)) return p;
  if (p.startsWith('/api/media/')) return p;

  const lower = p.toLowerCase();
  const uploadsIdx = lower.indexOf('/uploads/');
  if (uploadsIdx !== -1) {
    p = p.slice(uploadsIdx);
  } else if (lower.startsWith('uploads/')) {
    p = `/${p}`;
  }

  if (!p.includes('/')) {
    const subdir = managedUploadSubdir(p);
    if (subdir) p = `/uploads/${subdir}/${p}`;
  }

  if (p.startsWith('/uploads/')) {
    return toMediaApiPath(p) || p;
  }

  if (p.startsWith('/')) return p;

  return `/img/profile_images/${p}`;
}
