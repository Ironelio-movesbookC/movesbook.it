'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface EditableCellProps {
  value: string | number;
  onSave: (newValue: string | number) => void;
  type?: 'text' | 'number' | 'date' | 'select';
  options?: string[]; // For select type
  className?: string;
  placeholder?: string;
  readOnly?: boolean;
}

export default function EditableCell({
  value,
  onSave,
  type = 'text',
  options = [],
  className = '',
  placeholder = '',
  readOnly = false
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      }
    }
  }, [isEditing]);

  const handleSave = useCallback(() => {
    if (editValue !== value) {
      onSave(editValue);
    }
    setIsEditing(false);
  }, [editValue, value, onSave]);

  // Handle click outside to save
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cellRef.current && !cellRef.current.contains(event.target as Node)) {
        handleSave();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isEditing, handleSave]);

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    } else if (e.key === 'Tab') {
      handleSave();
      // Allow default tab behavior
    }
  };

  const handleDoubleClick = () => {
    if (!readOnly) {
      setIsEditing(true);
    }
  };

  if (readOnly || !isEditing) {
    return (
      <div
        ref={cellRef}
        className={`cursor-pointer hover:bg-blue-50 px-1 py-1 ${className} ${
          !readOnly ? 'hover:ring-1 hover:ring-blue-300' : ''
        }`}
        onDoubleClick={handleDoubleClick}
        title={readOnly ? '' : 'Double-click to edit'}
      >
        {value || <span className="text-gray-400">{placeholder || '—'}</span>}
      </div>
    );
  }

  // Render appropriate input based on type
  if (type === 'select') {
    return (
      <div ref={cellRef} className={className}>
        <select
          ref={inputRef as React.RefObject<HTMLSelectElement>}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className="w-full px-1 py-1 border-2 border-blue-500 rounded focus:outline-none focus:border-blue-600 text-xs"
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div ref={cellRef} className={className}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type={type}
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleSave}
        placeholder={placeholder}
        className="w-full px-1 py-1 border-2 border-blue-500 rounded focus:outline-none focus:border-blue-600 text-xs"
      />
    </div>
  );
}

