'use client';

import { useEffect, useState } from 'react';
import { DEFAULT_HERO_BANNER_URL } from '@/lib/profileBannerSequence';

type SafeCoverImageProps = {
  src: string;
  alt?: string;
  className?: string;
  /** When true, fill the positioned parent (absolute inset-0). */
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  fallbackSrc?: string;
};

/**
 * Avoid next/image optimizer for user uploads under `/uploads/...`.
 * Missing files fall back instead of throwing ImageError under `next start`.
 */
export default function SafeCoverImage({
  src,
  alt = '',
  className = '',
  fill = false,
  width,
  height,
  priority = false,
  fallbackSrc = DEFAULT_HERO_BANNER_URL,
}: SafeCoverImageProps) {
  const [current, setCurrent] = useState(src || fallbackSrc);

  useEffect(() => {
    setCurrent(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={fill ? `absolute inset-0 h-full w-full ${className}` : className}
      onError={() => {
        if (current !== fallbackSrc) setCurrent(fallbackSrc);
      }}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
    />
  );
}
