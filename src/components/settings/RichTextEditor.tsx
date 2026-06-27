'use client';

import React, { useRef, useState, useEffect } from 'react';
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
}

export default function RichTextEditor({ 
  value, 
  onChange, 
  placeholder = 'Type your text here...',
  minHeight = '150px',
  language = 'English'
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Initialize editor content (skip while user is typing — avoids wiping the caret)
  useEffect(() => {
    if (!editorRef.current || isFocused) return;
    const next = value || '';
    if (editorRef.current.innerHTML !== next) {
      editorRef.current.innerHTML = next;
    }
  }, [value, isFocused]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
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
        {/* Font Family */}
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

        {/* Font Size */}
        <select
          onChange={changeFontSize}
          className="px-2 py-1 border border-gray-300 rounded text-sm bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Font Size"
        >
          <option value="1">Small</option>
          <option value="3" selected>Normal</option>
          <option value="5">Large</option>
          <option value="7">Huge</option>
        </select>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Text Formatting */}
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

        {/* Text Color */}
        <div className="relative group">
          <input
            type="color"
            onChange={changeTextColor}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer hover:border-gray-400"
            title="Text Color"
          />
        </div>

        {/* Background Color */}
        <div className="relative group">
          <input
            type="color"
            onChange={changeBackgroundColor}
            className="w-8 h-8 border border-gray-300 rounded cursor-pointer hover:border-gray-400"
            title="Background Color"
          />
        </div>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Alignment */}
        <button
          onClick={() => execCommand('justifyLeft')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Align Left"
          type="button"
        >
          <AlignLeft className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('justifyCenter')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Align Center"
          type="button"
        >
          <AlignCenter className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('justifyRight')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Align Right"
          type="button"
        >
          <AlignRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('justifyFull')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Justify"
          type="button"
        >
          <AlignJustify className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Lists */}
        <button
          onClick={() => execCommand('insertUnorderedList')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Bullet List"
          type="button"
        >
          <List className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('insertOrderedList')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Numbered List"
          type="button"
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Indentation */}
        <button
          onClick={() => execCommand('indent')}
          className="p-2 hover:bg-gray-200 rounded transition text-sm font-bold"
          title="Increase Indent"
          type="button"
        >
          →
        </button>
        <button
          onClick={() => execCommand('outdent')}
          className="p-2 hover:bg-gray-200 rounded transition text-sm font-bold"
          title="Decrease Indent"
          type="button"
        >
          ←
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Insert Link */}
        <button
          onClick={addLink}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Insert Link"
          type="button"
        >
          <Link className="w-4 h-4" />
        </button>

        {/* Insert Image */}
        <button
          onClick={addImage}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Insert Image"
          type="button"
        >
          <ImageIcon className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Quote */}
        <button
          onClick={() => execCommand('formatBlock', 'blockquote')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Quote"
          type="button"
        >
          <Quote className="w-4 h-4" />
        </button>

        {/* Code */}
        <button
          onClick={() => execCommand('formatBlock', 'pre')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Code Block"
          type="button"
        >
          <Code className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Undo/Redo */}
        <button
          onClick={() => execCommand('undo')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Undo (Ctrl+Z)"
          type="button"
        >
          <Undo className="w-4 h-4" />
        </button>
        <button
          onClick={() => execCommand('redo')}
          className="p-2 hover:bg-gray-200 rounded transition"
          title="Redo (Ctrl+Y)"
          type="button"
        >
          <Redo className="w-4 h-4" />
        </button>

        <div className="w-px h-6 bg-gray-300 mx-1"></div>

        {/* Remove Formatting */}
        <button
          onClick={() => execCommand('removeFormat')}
          className="p-2 hover:bg-gray-200 rounded transition text-xs font-bold"
          title="Remove Formatting"
          type="button"
        >
          Clear
        </button>
      </div>

      {/* Editor Area */}
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`p-4 outline-none overflow-auto ${isFocused ? 'ring-2 ring-blue-500' : ''}`}
        style={{ minHeight }}
        data-placeholder={placeholder}
        suppressContentEditableWarning
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

