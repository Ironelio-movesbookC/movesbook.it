'use client';

import { useMemo } from 'react';
import { prepareExerciseRichHtmlForDisplay } from '@/utils/exerciseRichTextDisplay';
import { richTextToPlainText } from '@/utils/richTextTranslation';

const PREVIEW_STYLES = `
  .ogp-rich-description b,
  .ogp-rich-description strong {
    font-weight: 700;
  }
  .ogp-rich-description i,
  .ogp-rich-description em {
    font-style: italic;
  }
  .ogp-rich-description u {
    text-decoration: underline;
  }
  .ogp-rich-description s,
  .ogp-rich-description strike {
    text-decoration: line-through;
  }
  .ogp-rich-description ul {
    list-style-type: disc;
    margin: 0.5em 0 0.5em 1.25rem;
    padding-left: 0;
  }
  .ogp-rich-description ol {
    list-style-type: decimal;
    margin: 0.5em 0 0.5em 1.25rem;
    padding-left: 0;
  }
  .ogp-rich-description li {
    display: list-item;
    margin: 0.15em 0;
  }
  .ogp-rich-description a {
    color: #2563eb;
    text-decoration: underline;
  }
  .ogp-rich-description p {
    margin: 0.35em 0;
  }
  .ogp-rich-description p:first-child {
    margin-top: 0;
  }
  .ogp-rich-description p:last-child {
    margin-bottom: 0;
  }
  .ogp-rich-description div {
    margin: 0.25em 0;
  }
  .ogp-rich-description font {
    line-height: inherit;
  }
  .ogp-rich-description img {
    max-width: 100%;
    height: auto;
  }
`;

type Props = {
  html: string | null | undefined;
  className?: string;
  /** When true, render stripped plain text (for line-clamp cards / titles). */
  plain?: boolean;
  as?: 'div' | 'p' | 'span';
};

/** Read-only OGP custom description — plain text or rich HTML from RichTextEditor. */
export default function OgpRichDescription({
  html,
  className = '',
  plain = false,
  as: Tag = 'div',
}: Props) {
  const prepared = useMemo(
    () => prepareExerciseRichHtmlForDisplay(html ?? ''),
    [html]
  );
  const plainText = useMemo(
    () => richTextToPlainText(html ?? ''),
    [html]
  );

  if (!plainText) return null;

  if (plain) {
    return <Tag className={className}>{plainText}</Tag>;
  }

  return (
    <>
      <style>{PREVIEW_STYLES}</style>
      <Tag
        className={`ogp-rich-description break-words ${className}`}
        dangerouslySetInnerHTML={{ __html: prepared }}
      />
    </>
  );
}

/** Plain-text form of an OGP description (HTML or legacy plain). */
export function ogpDescriptionPlainText(
  customDescription?: string | null,
  description?: string | null,
  fallback = ''
): string {
  const raw = customDescription || description || fallback || '';
  return richTextToPlainText(raw);
}
