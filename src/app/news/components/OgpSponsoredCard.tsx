'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import type { OgpSponsor } from '@/lib/news/ogpSponsors';
import { openSponsorLink, sponsorColsForSize } from '@/lib/news/ogpSponsors';

interface OgpSponsoredCardProps {
  sponsors: OgpSponsor[];
  delayMs: number;
}

export default function OgpSponsoredCard({ sponsors, delayMs }: OgpSponsoredCardProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    setIndex((i) => (sponsors.length === 0 ? 0 : Math.min(i, sponsors.length - 1)));
  }, [sponsors.length]);

  useEffect(() => {
    if (sponsors.length < 2) return;
    const timer = window.setInterval(() => {
      if (pausedRef.current) return;
      setIndex((i) => (i >= sponsors.length - 1 ? 0 : i + 1));
    }, Math.max(1000, delayMs));
    return () => window.clearInterval(timer);
  }, [sponsors.length, delayMs]);

  const current = sponsors[index] ?? sponsors[0];
  const handleOpen = useCallback(() => {
    if (!current?.linkUrl) return;
    openSponsorLink(current.linkUrl, current.linkTarget);
  }, [current]);

  if (!current) return null;

  const title = current.hoverTitle || 'Sponsored';
  const cols = sponsorColsForSize(current.size);
  const isWide = cols > 1;
  const colSpanClass =
    cols === 4 ? 'col-span-4' : cols === 3 ? 'col-span-3' : cols === 2 ? 'col-span-2' : '';

  return (
    <article
      className={`relative border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm flex flex-col min-w-0 h-full min-h-0 group ${
        isWide ? colSpanClass : 'p-3'
      }`}
      aria-label="Sponsored news"
      title={title}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <button
        type="button"
        className="flex-1 min-h-0 flex flex-col text-left w-full"
        onClick={handleOpen}
        title={title}
        aria-label={title}
      >
        <span
          className={`relative block w-full overflow-hidden rounded ${
            isWide ? 'h-full min-h-[17rem]' : 'h-28 mb-2'
          }`}
        >
          {current.image ? (
            <Image
              src={current.image}
              alt={title}
              fill
              className="object-cover"
              sizes={
                cols >= 3
                  ? '(max-width: 640px) 100vw, (max-width: 1024px) 75vw, 66vw'
                  : cols === 2
                    ? '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw'
                    : '(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 16vw'
              }
              unoptimized
            />
          ) : (
            <span className="absolute inset-0 bg-gray-200" />
          )}
        </span>
        <span className="px-3 pt-2 pb-2 flex-1 flex flex-col min-h-0">
          {current.hoverTitle ? (
            <span className="text-sm font-semibold text-gray-900 leading-snug line-clamp-3">
              {current.hoverTitle}
            </span>
          ) : null}
          <span className="mt-auto pt-2 text-[11px] text-gray-500">Sponsored</span>
        </span>
      </button>
    </article>
  );
}
