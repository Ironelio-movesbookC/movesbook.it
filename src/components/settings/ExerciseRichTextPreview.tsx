'use client';

import React, { useMemo } from 'react';
import { prepareExerciseRichHtmlForDisplay } from '@/utils/exerciseRichTextDisplay';

const PREVIEW_STYLES = `
  .exercise-rich-text-preview b,
  .exercise-rich-text-preview strong {
    font-weight: 700;
  }
  .exercise-rich-text-preview i,
  .exercise-rich-text-preview em {
    font-style: italic;
  }
  .exercise-rich-text-preview u {
    text-decoration: underline;
  }
  .exercise-rich-text-preview s,
  .exercise-rich-text-preview strike {
    text-decoration: line-through;
  }
  .exercise-rich-text-preview ul {
    list-style-type: disc;
    margin: 0.5em 0 0.5em 1.25rem;
    padding-left: 0;
  }
  .exercise-rich-text-preview ol {
    list-style-type: decimal;
    margin: 0.5em 0 0.5em 1.25rem;
    padding-left: 0;
  }
  .exercise-rich-text-preview li {
    display: list-item;
    margin: 0.15em 0;
  }
  .exercise-rich-text-preview a {
    color: #2563eb;
    text-decoration: underline;
  }
  .exercise-rich-text-preview p {
    margin: 0.35em 0;
  }
  .exercise-rich-text-preview p:first-child {
    margin-top: 0;
  }
  .exercise-rich-text-preview p:last-child {
    margin-bottom: 0;
  }
  .exercise-rich-text-preview div {
    margin: 0.25em 0;
  }
  .exercise-rich-text-preview blockquote {
    margin: 0.5em 0;
    padding-left: 0.75rem;
    border-left: 3px solid #d1d5db;
    color: #4b5563;
  }
  .exercise-rich-text-preview img {
    max-width: 100%;
    height: auto;
    border-radius: 0.375rem;
  }
`;

type Props = {
  html: string;
  className?: string;
  emptyLabel?: string;
};

/** Read-only HTML from `RichTextEditor` — preserves bold, color, lists, etc. */
export default function ExerciseRichTextPreview({
  html,
  className = '',
  emptyLabel = '—',
}: Props) {
  const prepared = useMemo(() => prepareExerciseRichHtmlForDisplay(html), [html]);
  const hasText = prepared.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length > 0;

  if (!hasText) {
    return <span className="text-gray-400">{emptyLabel}</span>;
  }

  return (
    <>
      <style>{PREVIEW_STYLES}</style>
      <div
        className={`exercise-rich-text-preview text-sm leading-relaxed text-gray-800 break-words ${className}`}
        dangerouslySetInnerHTML={{ __html: prepared }}
      />
    </>
  );
}
