'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Link, Image as ImageIcon, Code, Quote, Undo, Redo, Type
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  language?: string;
  /** Bump to force re-sync from `value` (e.g. after auto-translate). */
  revision?: number;
}

function parseMinHeightPx(minHeight: string): number {
  const n = parseInt(minHeight, 10);
  return Number.isFinite(n) ? n : 150;
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Type your text here...',
  minHeight = '150px',
  language = 'English',
  revision = 0,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastAppliedValueRef = useRef<string>('');
  const lastAppliedRevisionRef = useRef(0);
  const minHeightPx = parseMinHeightPx(minHeight);

  const adjustHeight = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(minHeightPx, el.scrollHeight)}px`;
  }, [minHeightPx]);

  useEffect(() => {
    if (!editorRef.current) return;
    const next = value || '';
    const revisionChanged = revision !== lastAppliedRevisionRef.current;
    if (next === lastAppliedValueRef.current && !revisionChanged) return;
    const currentHtml = editorRef.current.innerHTML;
    if (isFocused && next === currentHtml && !revisionChanged) {
      lastAppliedValueRef.current = next;
      return;
    }
    editorRef.current.innerHTML = next;
    lastAppliedValueRef.current = next;
    lastAppliedRevisionRef.current = revision;
    requestAnimationFrame(() => adjustHeight());
  }, [value, isFocused, revision, adjustHeight]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      lastAppliedValueRef.current = html;
      onChange(html);
      adjustHeight();
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    handleInput();
  };

  const addLink = () => {
    const url = prompt('Enter URL:');
    if (url) {
      execCommand('createLink', url);
    }
  };

  const addImage = () => {
    const url = prompt('Enter image URL:');
    if (url) {
      execCommand('insertImage', url);
    }
  };

  const changeFontSize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCommand('fontSize', e.target.value);
  };

  const changeFontFamily = (e: React.ChangeEvent<HTMLSelectElement>) => {
    execCommand('fontName', e.target.value);
  };

  const changeTextColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand('foreColor', e.target.value);
  };

  const changeBackgroundColor = (e: React.ChangeEvent<HTMLInputElement>) => {
    execCommand('hiliteColor', e.target.value);
  };

  return (
    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
      {/* Toolbar */}
      <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap items-center gap-1">
        <select
          onChange={changeFontFamily}
          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Font Family"
        >
          <option value="Arial">Arial</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Verdana">Verdana</option>
          <option value="Tahoma">Tahoma</option>
        </select>

        <select
          onChange={changeFontSize}
          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Font Size"
          defaultValue="3"
        >
          <option value="1">Small</option>
          <option value="3">Normal</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button
          onClick={() => execCommand('bold')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Bold (Ctrl+B)"
          type="button"
        >
          <Bold className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('italic')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Italic (Ctrl+I)"
          type="button"
        >
          <Italic className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('underline')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Underline (Ctrl+U)"
          type="button"
        >
          <Underline className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('strikeThrough')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Strikethrough"
          type="button"
        >
          <span className="text-lg font-bold">S̶</span>
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <input
          type="color"
          onChange={changeTextColor}
          className="w-8 h-8 border border-gray-300 rounded cursor-pointer hover:border-gray-400"
          title="Text Color"
        />

        <input
          type="color"
          onChange={changeBackgroundColor}
          className="w-8 h-8 border border-gray-300 rounded cursor-pointer hover:border-gray-400"
          title="Background Color"
        />

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button onClick={() => execCommand('justifyLeft')} className="p-2 hover:bg-gray-200 rounded transition" title="Align Left" type="button">
          <AlignLeft className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('justifyCenter')} className="p-2 hover:bg-gray-200 rounded transition" title="Align Center" type="button">
          <AlignCenter className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('justifyRight')} className="p-2 hover:bg-gray-200 rounded transition" title="Align Right" type="button">
          <AlignRight className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('justifyFull')} className="p-2 hover:bg-gray-200 rounded transition" title="Justify" type="button">
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button onClick={() => execCommand('insertUnorderedList')} className="p-2 hover:bg-gray-200 rounded transition" title="Bullet List" type="button">
          <List className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('insertOrderedList')} className="p-2 hover:bg-gray-200 rounded transition" title="Numbered List" type="button">
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button onClick={() => execCommand('indent')} className="p-2 hover:bg-gray-200 rounded transition text-sm font-bold" title="Increase Indent" type="button">
          →
        </button>
        <button onClick={() => execCommand('outdent')} className="p-2 hover:bg-gray-200 rounded transition text-sm font-bold" title="Decrease Indent" type="button">
          ←
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button onClick={addLink} className="p-2 hover:bg-gray-200 rounded transition" title="Insert Link" type="button">
          <Link className="w-4 h-4" />
        </button>
        <button onClick={addImage} className="p-2 hover:bg-gray-200 rounded transition" title="Insert Image" type="button">
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button onClick={() => execCommand('formatBlock', 'blockquote')} className="p-2 hover:bg-gray-200 rounded transition" title="Quote" type="button">
          <Quote className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('formatBlock', 'pre')} className="p-2 hover:bg-gray-200 rounded transition" title="Code Block" type="button">
          <Code className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button onClick={() => execCommand('undo')} className="p-2 hover:bg-gray-200 rounded transition" title="Undo (Ctrl+Z)" type="button">
          <Undo className="w-4 h-4" />
        </button>
        <button onClick={() => execCommand('redo')} className="p-2 hover:bg-gray-200 rounded transition" title="Redo (Ctrl+Y)" type="button">
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        <button onClick={() => execCommand('removeFormat')} className="p-2 hover:bg-gray-200 rounded transition text-xs font-bold" title="Remove Formatting" type="button">
          Clear
        </button>
      </div>

      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false);
          handleInput();
        }}
        className={`p-4 outline-none overflow-visible ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
        aria-label={language}
      />

      <style jsx>{`
        [contentEditable]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
      `}</style>
    </div>
  );
}
