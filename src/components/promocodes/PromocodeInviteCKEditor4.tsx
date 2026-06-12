'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Script from 'next/script';

type CkeInstance = {
  getData: () => string;
  setData: (data: string, options?: { internal?: boolean }) => void;
  on: (event: string, callback: () => void) => void;
  destroy: (noUpdate?: boolean) => void;
};

declare global {
  interface Window {
    CKEDITOR?: {
      replace: (element: string | HTMLElement, config?: Record<string, unknown>) => CkeInstance;
      instances: Record<string, CkeInstance>;
      replaceClass?: string;
    };
    RootURL?: string;
  }
}

type PromocodeInviteCKEditor4Props = {
  id?: string;
  value: string;
  onChange: (html: string) => void;
  minHeightPx?: number;
};

function destroyCkeInstance(editorId: string): void {
  const CKEDITOR = window.CKEDITOR;
  if (!CKEDITOR?.instances[editorId]) return;
  try {
    CKEDITOR.instances[editorId].destroy(true);
  } catch {
    /* already torn down */
  }
  delete CKEDITOR.instances[editorId];
}

/** Legacy CKEditor 4 — matches PHP send-invite popup (manual init, not auto-replace). */
export default function PromocodeInviteCKEditor4({
  id,
  value,
  onChange,
  minHeightPx = 330,
}: PromocodeInviteCKEditor4Props) {
  const reactId = useId().replace(/:/g, '');
  const editorId = id?.trim() || `promocode_invite_editor_${reactId}`;
  const [scriptReady, setScriptReady] = useState(
    () => typeof window !== 'undefined' && !!window.CKEDITOR
  );
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const suppressChangeRef = useRef(false);
  const editorRef = useRef<CkeInstance | null>(null);
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    if (!scriptReady || typeof window === 'undefined' || !window.CKEDITOR) return;

    const element = document.getElementById(editorId);
    if (!element) return;

    destroyCkeInstance(editorId);

    const editor = window.CKEDITOR.replace(editorId, {
      height: minHeightPx,
      allowedContent: true,
    });
    editorRef.current = editor;

    editor.on('instanceReady', () => {
      suppressChangeRef.current = true;
      editor.setData(valueRef.current || '');
      suppressChangeRef.current = false;

      editor.on('change', () => {
        if (suppressChangeRef.current) return;
        onChangeRef.current(editor.getData());
      });
    });

    return () => {
      editorRef.current = null;
      destroyCkeInstance(editorId);
    };
  }, [editorId, minHeightPx, scriptReady]);

  useEffect(() => {
    const editor =
      editorRef.current ??
      (typeof window !== 'undefined' ? window.CKEDITOR?.instances[editorId] : undefined);
    if (!editor) return;
    const next = value || '';
    if (editor.getData() !== next) {
      suppressChangeRef.current = true;
      editor.setData(next);
      suppressChangeRef.current = false;
    }
  }, [editorId, value]);

  return (
    <>
      <Script
        src="/js/ckeditor/ckeditor.js"
        strategy="afterInteractive"
        onLoad={() => {
          window.RootURL = '/';
          if (window.CKEDITOR) {
            // CKEditor auto-replaces textareas with class "ckeditor" on domReady.
            // We initialize manually to avoid editor-element-conflict.
            window.CKEDITOR.replaceClass = '';
          }
          setScriptReady(true);
        }}
      />
      {/* Do not use className="ckeditor" — triggers CKEDITOR.replaceAll() */}
      <textarea id={editorId} name="content" defaultValue={value} />
    </>
  );
}
