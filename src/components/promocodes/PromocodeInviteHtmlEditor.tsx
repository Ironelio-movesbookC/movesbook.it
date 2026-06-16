'use client';

import { useEffect, useRef } from 'react';

type PromocodeInviteHtmlEditorProps = {
  value: string;
  onChange: (html: string) => void;
  minHeightPx?: number;
};

/** Lightweight HTML editor for promocode invite emails (avoids CKEditor 41 vs React 42+ mismatch). */
export default function PromocodeInviteHtmlEditor({
  value,
  onChange,
  minHeightPx = 330,
}: PromocodeInviteHtmlEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const suppressSyncRef = useRef(false);

  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const next = value || '';
    if (el.innerHTML !== next) {
      suppressSyncRef.current = true;
      el.innerHTML = next;
      queueMicrotask(() => {
        suppressSyncRef.current = false;
      });
    }
  }, [value]);

  return (
    <div
      ref={editorRef}
      className="promocode-invite-html-editor"
      contentEditable
      suppressContentEditableWarning
      style={{ minHeight: minHeightPx }}
      onInput={(e) => {
        if (suppressSyncRef.current) return;
        onChange((e.currentTarget as HTMLDivElement).innerHTML);
      }}
    />
  );
}
