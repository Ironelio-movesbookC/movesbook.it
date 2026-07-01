import { extractYouTubeVideoId } from '@/constants/tools.constants';
import { rewriteUploadUrlsInHtml } from '@/lib/uploadMediaUrl';

function extractVimeoVideoId(url: string): string | null {
  const m = (url || '').trim().match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return m?.[1] ?? null;
}

function mediaEmbedHtml(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  const ytId = extractYouTubeVideoId(trimmed);
  if (ytId) {
    return `<div class="rich-html-video"><iframe src="https://www.youtube-nocookie.com/embed/${ytId}?rel=0" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe></div>`;
  }

  const vimeoId = extractVimeoVideoId(trimmed);
  if (vimeoId) {
    return `<div class="rich-html-video"><iframe src="https://player.vimeo.com/video/${vimeoId}" title="Vimeo video" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }

  return null;
}

/** CKEditor 5 saves media as `<oembed>` — browsers need a real iframe to play video. */
export function rewriteMediaEmbedsInHtml(html: string): string {
  if (!html) return html;

  let result = html;

  result = result.replace(
    /<figure\b[^>]*class="[^"]*\bmedia\b[^"]*"[^>]*>\s*<oembed\b[^>]*\burl=["']([^"']+)["'][^>]*>\s*<\/oembed>\s*<\/figure>/gi,
    (_match, url: string) => {
      const embed = mediaEmbedHtml(url);
      return embed ? `<figure class="media">${embed}</figure>` : _match;
    },
  );

  result = result.replace(
    /<oembed\b[^>]*\burl=["']([^"']+)["'][^>]*>\s*<\/oembed>/gi,
    (_match, url: string) => mediaEmbedHtml(url) ?? _match,
  );

  result = result.replace(
    /<div\b[^>]*\bdata-oembed-url=["']([^"']+)["'][^>]*>\s*<\/div>/gi,
    (_match, url: string) => mediaEmbedHtml(url) ?? _match,
  );

  // YouTube URL wrongly inserted via the image button — replace broken <img> with a player.
  result = result.replace(
    /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi,
    (match, src: string) => {
      const embed = mediaEmbedHtml(src);
      return embed ?? match;
    },
  );

  return result;
}

/** Normalize CKEditor HTML for read-only display (uploads + YouTube/Vimeo embeds). */
export function prepareRichHtmlForDisplay(html: string): string {
  if (!html?.trim()) return '';
  return rewriteMediaEmbedsInHtml(rewriteUploadUrlsInHtml(html));
}
