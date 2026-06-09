'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Bold, Italic, Underline, Strikethrough, AlignLeft, AlignCenter, AlignRight, AlignJustify, List, ListOrdered, Link as LinkIcon, Image as ImageIcon, Code, Undo, Redo } from 'lucide-react';

interface WeeklyInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  weekNumber: number;
  weekId?: string;
  initialPeriodId?: string;
  initialNotes?: string;
  onSave: (data: { periodId: string; notes: string }) => void;
}

export default function WeeklyInfoModal({
  isOpen,
  onClose,
  weekNumber,
  weekId,
  initialPeriodId = '',
  initialNotes = '',
  onSave
}: WeeklyInfoModalProps) {
  const [periodId, setPeriodId] = useState(initialPeriodId);
  const [periods, setPeriods] = useState<any[]>([]);
  const [notes, setNotes] = useState(initialNotes);
  const editorRef = useRef<HTMLDivElement>(null);

  // Load periods from API
  useEffect(() => {
    const loadPeriods = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('/api/nutrition/periods', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          setPeriods(data.periods || []);
        }
      } catch (error) {
        console.error('Error loading periods:', error);
      }
    };

    if (isOpen) {
      loadPeriods();
    }
  }, [isOpen]);

  // Initialize content when modal opens
  useEffect(() => {
    if (isOpen && editorRef.current) {
      editorRef.current.innerHTML = initialNotes || '';
      setPeriodId(initialPeriodId);
      
      // Enable rich text editing and ensure contentEditable is active
      editorRef.current.focus();
      
      // Enable design mode features
      try {
        document.execCommand('styleWithCSS', false, 'true');
        document.execCommand('defaultParagraphSeparator', false, 'p');
      } catch (e) {
        console.warn('execCommand not fully supported:', e);
      }

      console.log('✅ Editor initialized with content:', {
        hasContent: !!initialNotes,
        contentLength: initialNotes?.length || 0
      });
    }
  }, [isOpen, initialNotes, initialPeriodId]);

  if (!isOpen) return null;

  // Rich text editor formatting commands
  const execCommand = (command: string, value: string | undefined = undefined) => {
    if (!editorRef.current) return;
    
    // Focus the editor first
    editorRef.current.focus();
    
    // Handle alignment commands specially (execCommand is deprecated for these)
    if (command.startsWith('justify')) {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) {
        console.warn('⚠️ No selection for alignment');
        return;
      }
      
      // Get the alignment value
      let textAlign = 'left';
      if (command === 'justifyCenter') textAlign = 'center';
      else if (command === 'justifyRight') textAlign = 'right';
      else if (command === 'justifyFull') textAlign = 'justify';
      
      // Get the container node
      let node = selection.anchorNode;
      while (node && node !== editorRef.current) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          // Apply style to block-level element
          if (element.tagName === 'P' || element.tagName === 'DIV' || element.tagName === 'H1' || 
              element.tagName === 'H2' || element.tagName === 'H3' || element.tagName === 'UL' || 
              element.tagName === 'OL' || element.tagName === 'LI') {
            element.style.textAlign = textAlign;
            console.log('✅ Applied alignment:', { tag: element.tagName, textAlign });
            return;
          }
        }
        node = node.parentNode;
      }
      
      // If no suitable parent found, wrap selection in a div and apply alignment
      try {
        const range = selection.getRangeAt(0);
        const wrapper = document.createElement('div');
        wrapper.style.textAlign = textAlign;
        range.surroundContents(wrapper);
        console.log('✅ Applied alignment with wrapper:', textAlign);
      } catch (e) {
        console.error('❌ Failed to apply alignment:', e);
      }
      return;
    }
    
    // Execute the command normally for other commands
    const success = document.execCommand(command, false, value);
    
    console.log('🎨 execCommand:', { command, value, success });
    
    if (!success) {
      console.warn('⚠️ Command failed:', command);
    }
    
    // Keep focus on editor
    editorRef.current.focus();
  };

  const handleSave = () => {
    const htmlContent = editorRef.current?.innerHTML || '';
    console.log('💾 WeeklyInfoModal - Saving:', {
      periodId,
      notesLength: htmlContent.length,
      notesPreview: htmlContent.substring(0, 100)
    });
    
    onSave({
      periodId,
      notes: htmlContent
    });
    onClose();
  };

  const handleClear = () => {
    if (editorRef.current) {
      editorRef.current.innerHTML = '';
      editorRef.current.focus();
    }
  };

  const selectedPeriod = periods.find(p => p.id === periodId);

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <style>{`
        .rich-text-editor {
          font-family: Arial, sans-serif;
        }
        .rich-text-editor *[style*="bold"],
        .rich-text-editor *[style*="font-weight: bold"],
        .rich-text-editor *[style*="font-weight:bold"],
        .rich-text-editor *[style*="font-weight: 700"],
        .rich-text-editor b,
        .rich-text-editor strong {
          font-weight: bold !important;
        }
        .rich-text-editor *[style*="italic"],
        .rich-text-editor *[style*="font-style: italic"],
        .rich-text-editor *[style*="font-style:italic"],
        .rich-text-editor i,
        .rich-text-editor em {
          font-style: italic !important;
        }
        .rich-text-editor *[style*="underline"],
        .rich-text-editor u {
          text-decoration: underline !important;
        }
        .rich-text-editor *[style*="line-through"],
        .rich-text-editor strike,
        .rich-text-editor s {
          text-decoration: line-through !important;
        }
        .rich-text-editor ul {
          list-style-type: disc !important;
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 10px;
          padding-left: 20px;
        }
        .rich-text-editor ol {
          list-style-type: decimal !important;
          margin-left: 20px;
          margin-top: 10px;
          margin-bottom: 10px;
          padding-left: 20px;
        }
        .rich-text-editor li {
          margin: 5px 0;
          display: list-item !important;
        }
        .rich-text-editor a {
          color: #2563eb;
          text-decoration: underline;
        }
        .rich-text-editor img {
          max-width: 100%;
          height: auto;
        }
        .rich-text-editor hr {
          border: none;
          border-top: 1px solid #ccc;
          margin: 10px 0;
        }
        .rich-text-editor p {
          margin: 5px 0;
        }
        .rich-text-editor div {
          margin: 2px 0;
        }
        .rich-text-editor h1 {
          font-size: 2em;
          font-weight: bold;
          margin: 10px 0;
        }
        .rich-text-editor h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin: 10px 0;
        }
        .rich-text-editor h3 {
          font-size: 1.17em;
          font-weight: bold;
          margin: 10px 0;
        }
        .rich-text-editor blockquote {
          border-left: 4px solid #ddd;
          padding-left: 15px;
          margin-left: 0;
          color: #666;
        }
        /* Font styles */
        .rich-text-editor *[face],
        .rich-text-editor font {
          font-family: inherit;
        }
        .rich-text-editor *[size="1"],
        .rich-text-editor font[size="1"] {
          font-size: 10px;
        }
        .rich-text-editor *[size="3"],
        .rich-text-editor font[size="3"] {
          font-size: 14px;
        }
        .rich-text-editor *[size="5"],
        .rich-text-editor font[size="5"] {
          font-size: 18px;
        }
        .rich-text-editor *[size="7"],
        .rich-text-editor font[size="7"] {
          font-size: 24px;
        }
      `}</style>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-pink-100">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📝</span>
            <h2 className="text-xl font-bold text-pink-700">
              Week planning notes
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Row 1: Period Name Display (Read-only) */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-semibold text-gray-700 whitespace-nowrap">
              - Name of the Period
            </label>
            <div className="flex-1 flex items-center gap-2 px-3 py-2 bg-gray-100 border border-gray-300 rounded text-sm">
              {selectedPeriod ? (
                <>
                  <div
                    className="w-5 h-5 rounded border border-gray-400 flex-shrink-0"
                    style={{ backgroundColor: selectedPeriod.color }}
                  />
                  <span className="font-medium text-gray-900">{selectedPeriod.name}</span>
                  <span className="text-gray-500 text-xs ml-auto">(Set in Personal Settings)</span>
                </>
              ) : (
                <span className="text-gray-500 italic">No period assigned</span>
              )}
            </div>
          </div>

          {/* Row 2: Rich Text Editor */}
          <div className="space-y-2">
            {/* Formatting Toolbar */}
            <div className="flex items-center gap-1 p-2 bg-gray-100 border border-gray-300 rounded-t flex-wrap">
              {/* Font Style Group */}
              <select
                onChange={(e) => execCommand('fontName', e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded bg-white"
                defaultValue="Arial"
              >
                <option value="Arial">Arial</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Georgia">Georgia</option>
                <option value="Verdana">Verdana</option>
              </select>

              <select
                onChange={(e) => execCommand('fontSize', e.target.value)}
                className="px-2 py-1 text-sm border border-gray-300 rounded bg-white ml-1"
                defaultValue="3"
              >
                <option value="1">Small</option>
                <option value="3">Normal</option>
                <option value="5">Large</option>
                <option value="7">Huge</option>
              </select>

              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Text Formatting */}
              <button
                onClick={() => execCommand('bold')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Bold"
              >
                <Bold size={18} />
              </button>
              <button
                onClick={() => execCommand('italic')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Italic"
              >
                <Italic size={18} />
              </button>
              <button
                onClick={() => execCommand('underline')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Underline"
              >
                <Underline size={18} />
              </button>
              <button
                onClick={() => execCommand('strikeThrough')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Strikethrough"
              >
                <Strikethrough size={18} />
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Colors */}
              <input
                type="color"
                onChange={(e) => execCommand('foreColor', e.target.value)}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                title="Text Color"
              />
              <input
                type="color"
                onChange={(e) => execCommand('backColor', e.target.value)}
                className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                title="Background Color"
              />

              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Alignment */}
              <button
                onClick={() => execCommand('justifyLeft')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Align Left"
              >
                <AlignLeft size={18} />
              </button>
              <button
                onClick={() => execCommand('justifyCenter')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Align Center"
              >
                <AlignCenter size={18} />
              </button>
              <button
                onClick={() => execCommand('justifyRight')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Align Right"
              >
                <AlignRight size={18} />
              </button>
              <button
                onClick={() => execCommand('justifyFull')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Justify"
              >
                <AlignJustify size={18} />
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Lists */}
              <button
                onClick={() => execCommand('insertUnorderedList')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Bullet List"
              >
                <List size={18} />
              </button>
              <button
                onClick={() => execCommand('insertOrderedList')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Numbered List"
              >
                <ListOrdered size={18} />
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Indentation */}
              <button
                onClick={() => execCommand('indent')}
                className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
                title="Increase Indent"
              >
                →
              </button>
              <button
                onClick={() => execCommand('outdent')}
                className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
                title="Decrease Indent"
              >
                ←
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Insert */}
              <button
                onClick={() => {
                  const url = prompt('Enter URL:');
                  if (url) execCommand('createLink', url);
                }}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Insert Link"
              >
                <LinkIcon size={18} />
              </button>
              <button
                onClick={() => {
                  const url = prompt('Enter image URL:');
                  if (url) execCommand('insertImage', url);
                }}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Insert Image"
              >
                <ImageIcon size={18} />
              </button>
              <button
                onClick={() => execCommand('insertHorizontalRule')}
                className="px-2 py-1 text-sm hover:bg-gray-200 rounded"
                title="Insert Horizontal Line"
              >
                ━
              </button>

              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Undo/Redo */}
              <button
                onClick={() => execCommand('undo')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Undo"
              >
                <Undo size={18} />
              </button>
              <button
                onClick={() => execCommand('redo')}
                className="p-1.5 hover:bg-gray-200 rounded"
                title="Redo"
              >
                <Redo size={18} />
              </button>

              <div className="flex-1"></div>

              {/* Test Button - Insert formatted text */}
              <button
                onClick={() => {
                  if (editorRef.current) {
                    editorRef.current.innerHTML += '<p><strong>Bold text</strong>, <em>italic text</em>, <u>underlined text</u></p>';
                  }
                }}
                className="px-3 py-1 text-sm bg-purple-500 text-white rounded hover:bg-purple-600"
                title="Test formatting"
              >
                Test
              </button>
              
              {/* Clear Button */}
              <button
                onClick={handleClear}
                className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                title="Clear All"
              >
                Clear
              </button>
            </div>

            {/* Editor Area */}
            <div
              ref={editorRef}
              contentEditable="true"
              spellCheck="false"
              className="rich-text-editor min-h-[300px] max-h-[400px] overflow-y-auto p-4 border border-gray-300 rounded-b bg-white focus:outline-none focus:ring-2 focus:ring-pink-500"
              style={{
                fontSize: '14px',
                lineHeight: '1.6',
                wordWrap: 'break-word',
                whiteSpace: 'normal',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text'
              }}
              suppressContentEditableWarning
              onInput={(e) => {
                // Update internal state when content changes
                const content = e.currentTarget.innerHTML;
                setNotes(content);
                console.log('📝 Content changed, length:', content.length);
              }}
              onFocus={() => {
                console.log('✏️ Editor focused');
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

