'use client';

import Image from 'next/image';
import type { CSSProperties } from 'react';
import { promocodeFlagCdnFallback } from '@/components/promocodes/promocodeImageUrls';

type PromocodeAssetImageProps = {
  src: string;
  fallbackSrc: string;
  countryCode?: string | null;
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

export default function PromocodeAssetImage({
  src,
  fallbackSrc,
  countryCode,
  alt = '',
  className,
  style,
}: PromocodeAssetImageProps) {
  const hideMissingFlag = fallbackSrc.includes('no_flag');

  if (hideMissingFlag && src === fallbackSrc) {
    return null;
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={24}
      height={16}
      className={className}
      style={style}
      unoptimized
      onError={(e) => {
        const img = e.currentTarget;
        if (img.dataset.fallbackApplied === '2') return;
        if (img.dataset.fallbackApplied !== '1') {
          const cdn = promocodeFlagCdnFallback(countryCode);
          if (cdn && img.src !== cdn) {
            img.dataset.fallbackApplied = '1';
            img.src = cdn;
            return;
          }
        }
        if (img.src.endsWith(fallbackSrc)) return;
        if (hideMissingFlag) {
          img.dataset.fallbackApplied = '2';
          img.style.display = 'none';
          return;
        }
        img.dataset.fallbackApplied = '2';
        img.src = fallbackSrc;
      }}
    />
  );
}
