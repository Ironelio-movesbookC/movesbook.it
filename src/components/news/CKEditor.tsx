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

export default function CKEditorComponent({ 
  value, 
  onChange, 
  placeholder = 'Enter content...',
  id 
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
        editor={ClassicEditor as any}
        data={value || ''}
        config={{
          placeholder,
          toolbar: [
            'heading', '|',
            'bold', 'italic', 'link', '|',
            'bulletedList', 'numberedList', '|',
            'blockQuote', 'insertTable', '|',
            'imageUpload', 'mediaEmbed', '|',
            'undo', 'redo'
          ],
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
        }}
        onChange={(event, editor) => {
          const data = editor.getData();
          onChange(data);
        }}
      />
    </div>
  );
}
