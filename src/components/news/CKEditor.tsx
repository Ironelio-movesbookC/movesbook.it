'use client';

import { useEffect, useMemo, useRef } from 'react';
import { rewriteUploadUrlsInHtml } from '@/lib/uploadMediaUrl';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface CKEditorComponentProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  id?: string;
  /** Stable per field — do not change when switching language tabs. */
  instanceId?: string;
  /** Current language tab; editor content is swapped when this changes. */
  localeKey?: string;
  /** Called when the editor is ready so the parent can read HTML before a tab switch. */
  registerGetData?: (getData: () => string) => void;
  readOnly?: boolean;
  minHeightPx?: number;
}

class NewsImageUploadAdapter {
  private loader: any;
  private token: string;

  constructor(loader: any, token: string) {
    this.loader = loader;
    this.token = token;
  }

  upload(): Promise<{ default: string }> {
    return this.loader.file.then((file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'content');

      return fetch('/api/news/upload-image', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
        },
        body: formData,
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.path) {
            return { default: data.path };
          }
          throw new Error(data.error || 'Image upload failed');
        });
    });
  }

  abort() {}
}

function NewsImageUploadAdapterPlugin(editor: any) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
    const token =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('token') || localStorage.getItem('adminToken'))) ||
      '';
    return new NewsImageUploadAdapter(loader, token);
  };
}

export default function CKEditorComponent({
  value,
  onChange,
  placeholder = 'Enter content...',
  id,
  instanceId,
  localeKey,
  registerGetData,
  readOnly = false,
  minHeightPx = 400,
}: CKEditorComponentProps) {
  const editorRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  const suppressOnChangeRef = useRef(false);
  onChangeRef.current = onChange;

  const mountKey = `${instanceId ?? id ?? 'ckeditor'}-${localeKey ?? 'default'}`;
  const displayValue = useMemo(() => rewriteUploadUrlsInHtml(value || ''), [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const next = displayValue;
    if (editor.getData() !== next) {
      suppressOnChangeRef.current = true;
      editor.setData(next);
      queueMicrotask(() => {
        suppressOnChangeRef.current = false;
      });
    }
  }, [displayValue]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .ckeditor-wrapper .ck-editor__editable {
        color: #333 !important;
        background-color: #fff !important;
        min-height: ${minHeightPx}px;
      }
      .ckeditor-wrapper .ck-editor__editable * {
        color: #333 !important;
      }
      .ckeditor-wrapper .ck-editor__editable p,
      .ckeditor-wrapper .ck-editor__editable div,
      .ckeditor-wrapper .ck-editor__editable span,
      .ckeditor-wrapper .ck-editor__editable h1,
      .ckeditor-wrapper .ck-editor__editable h2,
      .ckeditor-wrapper .ck-editor__editable h3,
      .ckeditor-wrapper .ck-editor__editable h4,
      .ckeditor-wrapper .ck-editor__editable h5,
      .ckeditor-wrapper .ck-editor__editable h6,
      .ckeditor-wrapper .ck-editor__editable li,
      .ckeditor-wrapper .ck-editor__editable td,
      .ckeditor-wrapper .ck-editor__editable th,
      .ckeditor-wrapper .ck-editor__editable a,
      .ckeditor-wrapper .ck-editor__editable strong,
      .ckeditor-wrapper .ck-editor__editable b,
      .ckeditor-wrapper .ck-editor__editable em,
      .ckeditor-wrapper .ck-editor__editable i,
      .ckeditor-wrapper .ck-editor__editable u,
      .ckeditor-wrapper .ck-editor__editable code,
      .ckeditor-wrapper .ck-editor__editable pre,
      .ckeditor-wrapper .ck-editor__editable blockquote,
      .ckeditor-wrapper .ck-editor__editable figcaption {
        color: #333 !important;
      }
      .ckeditor-wrapper .ck-editor__editable a {
        color: #0782C1 !important;
      }
      .ckeditor-wrapper .ck-editor__editable.ck-placeholder::before {
        color: #999 !important;
      }
      .ckeditor-wrapper .ck-toolbar {
        background-color: #f5f5f5 !important;
        border: 1px solid #ddd !important;
      }
      .ckeditor-wrapper .ck-toolbar button {
        color: #333 !important;
      }
      .ckeditor-wrapper .ck-editor__main {
        border: 1px solid #ddd !important;
        background-color: #fff !important;
      }
    `;
    document.head.appendChild(style);
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <div className="ckeditor-wrapper">
      <CKEditor
        key={mountKey}
        editor={ClassicEditor as any}
        data={displayValue}
        config={{
          placeholder,
          mediaEmbed: {
            previewsInData: true,
          },
          extraPlugins: readOnly ? [] : [NewsImageUploadAdapterPlugin],
          toolbar: readOnly
            ? ([
                'heading',
                '|',
                'bold',
                'italic',
                'link',
                '|',
                'bulletedList',
                'numberedList',
                '|',
                'blockQuote',
                'insertTable',
                '|',
                'undo',
                'redo',
              ] as any)
            : ([
                'heading',
                '|',
                'bold',
                'italic',
                'link',
                '|',
                'bulletedList',
                'numberedList',
                '|',
                'blockQuote',
                'insertTable',
                '|',
                'imageUpload',
                'mediaEmbed',
                '|',
                'undo',
                'redo',
              ] as any),
          heading: {
            options: [
              { model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph' },
              { model: 'heading1', view: 'h1', title: 'Heading 1', class: 'ck-heading_heading1' },
              { model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2' },
              { model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3' },
              { model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4' },
              { model: 'heading5', view: 'h5', title: 'Heading 5', class: 'ck-heading_heading5' },
              { model: 'heading6', view: 'h6', title: 'Heading 6', class: 'ck-heading_heading6' }
            ]
          },
        }}
        onReady={(editor) => {
          editorRef.current = editor;
          registerGetData?.(() => editor.getData());
          if (readOnly) {
            try {
              editor.enableReadOnlyMode('pcu-readonly');
            } catch {
              // fallback below
              editor.isReadOnly = true;
            }
          }
        }}
        onChange={(event, editor) => {
          if (readOnly || suppressOnChangeRef.current) return;
          onChangeRef.current(editor.getData());
        }}
      />
    </div>
  );
}
