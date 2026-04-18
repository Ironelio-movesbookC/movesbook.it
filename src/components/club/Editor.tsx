'use client';

import { useEffect, useRef } from 'react';
import { CKEditor } from '@ckeditor/ckeditor5-react';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

interface CKEditorComponentProps {
  value: string;
  onChange: (data: string) => void;
  placeholder?: string;
  id?: string;
}

/* ---------------- IMAGE UPLOAD ---------------- */
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

/* ---------------- PLUGIN ---------------- */
function NewsImageUploadAdapterPlugin(editor: any) {
  editor.plugins.get('FileRepository').createUploadAdapter = (loader: any) => {
    const token =
      (typeof window !== 'undefined' &&
        (localStorage.getItem('token') || localStorage.getItem('adminToken'))) ||
      '';
    return new NewsImageUploadAdapter(loader, token);
  };
}

/* ---------------- COMPONENT ---------------- */
export default function CKEditorComponent({
  value,
  onChange,
  placeholder = 'Enter content...',
}: CKEditorComponentProps) {

  const editorRef = useRef<any>(null);

  useEffect(() => {
    const style = document.createElement('style');

    style.textContent = `
      .ckeditor-wrapper .ck-editor__editable {
        color: #333 !important;
        background-color: #fff !important;
        min-height: 400px;
      }

      .ckeditor-wrapper .ck-editor__editable * {
        color: #333 !important;
      }

      .ckeditor-wrapper .ck-toolbar {
        background-color: #f5f5f5 !important;
        border: 1px solid #ddd !important;
      }

      .ckeditor-wrapper .ck-editor__main {
        border: 1px solid #ddd !important;
      }

      /* ✅ TABLE STYLE (VERY IMPORTANT) */
      .ckeditor-wrapper table {
        border-collapse: collapse;
        width: 100%;
        margin-top: 10px;
      }

      .ckeditor-wrapper table td,
      .ckeditor-wrapper table th {
        border: 1px solid #ccc;
        padding: 8px;
      }

      .ckeditor-wrapper table th {
        background: #f3f3f3;
        font-weight: bold;
      }
    `;

    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="ckeditor-wrapper">
      <CKEditor
        editor={ClassicEditor as any}
        data={value || ''}
        config={{
          placeholder,

          extraPlugins: [NewsImageUploadAdapterPlugin],

          /* ✅ TOOLBAR */
          toolbar: [
            'heading', '|',
            'bold', 'italic', 'link', '|',
            'bulletedList', 'numberedList', '|',
            'blockQuote', 'insertTable', '|',
            'imageUpload', 'mediaEmbed', '|',
            'undo', 'redo'
          ],

          /* ✅ HEADINGS */
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

          /* ✅ TABLE FEATURES */
          table: {
            contentToolbar: [
              'tableColumn',
              'tableRow',
              'mergeTableCells'
            ]
          }
        }}

        onReady={(editor) => {
          editorRef.current = editor;
        }}

        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
    </div>
  );
}