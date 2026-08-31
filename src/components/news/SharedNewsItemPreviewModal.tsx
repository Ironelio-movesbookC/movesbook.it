'use client';

import Image from 'next/image';
import { X } from 'lucide-react';
import OgpRichDescription from '@/components/shared/OgpRichDescription';

export type SharedNewsPreviewPayload = {
  header: string;
  title: string;
  date: string;
  byline?: string | null;
  image?: string | null;
  imageHref?: string | null;
  descriptionHtml?: string | null;
};

function formatDate(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return '';
  }
}

type SharedNewsItemPreviewModalProps = {
  item: SharedNewsPreviewPayload | null;
  onClose: () => void;
};

/**
 * Same preview dialog as OGP News cards (topic header, image, title, date, byline, description).
 */
export default function SharedNewsItemPreviewModal({
  item,
  onClose,
}: SharedNewsItemPreviewModalProps) {
  if (!item) return null;

  const image = item.image?.trim() ? item.image : null;
  const href = item.imageHref?.trim() ? item.imageHref : null;
  const description = item.descriptionHtml?.trim() || '';

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shared-news-preview-modal-title"
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-300 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-shrink-0 items-center justify-between bg-gray-800 px-4 py-3 text-white">
          <span className="font-semibold" id="shared-news-preview-modal-title">
            {item.header || 'News'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-gray-300 hover:bg-gray-700 hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {image ? (
            href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-500"
                aria-label={`Open article: ${item.title}`}
              >
                <span className="relative block h-64 max-h-64 w-full">
                  <Image
                    src={image}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="(max-width: 512px) 100vw, 512px"
                    unoptimized
                  />
                </span>
              </a>
            ) : (
              <span className="relative block h-64 max-h-64 w-full">
                <Image
                  src={image}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                  unoptimized
                />
              </span>
            )
          ) : null}
          <div className="p-4">
            <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
            <div className="mt-1 flex w-full flex-nowrap items-center justify-between gap-2 text-sm text-gray-500">
              <span className="flex-shrink-0">{formatDate(item.date)}</span>
              {item.byline ? (
                <span className="ml-auto flex-shrink-0 text-blue-600">{item.byline}</span>
              ) : null}
            </div>
            {description ? (
              <div className="mt-3 max-h-60 overflow-y-auto overflow-x-hidden rounded-lg border border-gray-200 p-3 pr-2 text-sm text-gray-700">
                <OgpRichDescription html={description} className="text-sm text-gray-700" />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function resolveFeedItemImage(
  image: string | null | undefined,
  kind: 'news' | 'ogp' | 'ogp-group',
): string | null {
  if (!image) return null;
  if (kind === 'news' && !image.startsWith('/') && !image.startsWith('http')) {
    return `/img/news/${image}`;
  }
  return image;
}

type FeedPreviewSource = {
  kind: 'news' | 'ogp' | 'ogp-group';
  id: string;
  title: string | null;
  date: string;
  image: string | null;
  author?: string | null;
  categoryName?: string | null;
  method?: string | null;
  briefDesc?: string | null;
  internetLink?: string | null;
  topic?: string;
  creatorUsername?: string | null;
  url?: string;
  description?: string | null;
  customDescription?: string | null;
};

export function previewPayloadFromFeedItem(item: FeedPreviewSource): SharedNewsPreviewPayload {
  const title =
    item.title?.trim() ||
    (item.kind === 'news'
      ? 'Untitled'
      : item.customDescription?.trim() || item.description?.trim() || item.url || 'Untitled');

  if (item.kind === 'news') {
    const href = item.internetLink?.trim() || `/news-by-movesbook/${item.id}`;
    return {
      header: item.categoryName?.trim() || 'News',
      title,
      date: item.date,
      byline: item.author?.trim() ? `by ${item.author.trim()}` : null,
      image: resolveFeedItemImage(item.image, 'news'),
      imageHref: href || null,
      descriptionHtml:
        item.briefDesc?.trim() ||
        [item.categoryName, item.method, item.author].filter(Boolean).join(' · ') ||
        null,
    };
  }

  return {
    header: item.topic?.trim() || (item.kind === 'ogp-group' ? 'Group' : 'OGP News'),
    title,
    date: item.date,
    byline: item.creatorUsername?.trim() ? `by ${item.creatorUsername.trim()}` : null,
    image: resolveFeedItemImage(item.image, item.kind),
    imageHref: item.url?.trim() || null,
    descriptionHtml: item.customDescription || item.description || item.url || null,
  };
}

