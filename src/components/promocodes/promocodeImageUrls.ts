export const PROMOCODE_NO_PROFILE_IMAGE = '/img/no_image.svg';
export const PROMOCODE_NO_FLAG_IMAGE = '/img/no_flag.svg';

const PLACEHOLDER_PROFILE_NAMES = new Set(['', 'default.png', 'no_image.jpg', 'no_image.png']);

export function promocodeProfileImageUrl(image: string | null | undefined): string {
  const trimmed = image?.trim() ?? '';
  if (PLACEHOLDER_PROFILE_NAMES.has(trimmed.toLowerCase())) {
    return PROMOCODE_NO_PROFILE_IMAGE;
  }
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `/img/profile_images/${trimmed}`;
}

export function promocodeFlagImageUrl(flagImage: string | null | undefined): string | null {
  const trimmed = flagImage?.trim() ?? '';
  if (!trimmed) return null;
  if (trimmed.startsWith('/') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `/img/flags/${trimmed}`;
}
