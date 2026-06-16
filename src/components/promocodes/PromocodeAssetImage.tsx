'use client';

type PromocodeAssetImageProps = {
  src: string;
  fallbackSrc: string;
  alt?: string;
  className?: string;
};

export default function PromocodeAssetImage({
  src,
  fallbackSrc,
  alt = '',
  className,
}: PromocodeAssetImageProps) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={(e) => {
        const img = e.currentTarget;
        if (img.src.endsWith(fallbackSrc) || img.dataset.fallbackApplied === '1') return;
        img.dataset.fallbackApplied = '1';
        img.src = fallbackSrc;
      }}
    />
  );
}
