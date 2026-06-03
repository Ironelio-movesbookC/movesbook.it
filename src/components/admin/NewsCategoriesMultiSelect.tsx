'use client';

import { useEffect, useRef, useState } from 'react';
import { PCU_NEWS_FOLLOW_CATEGORIES } from '@/lib/admin/pcuAdminSettingsOptions';

type NewsCategoriesMultiSelectProps = {
  selected: Record<string, boolean>;
  onChange: (next: Record<string, boolean>) => void;
  disabled?: boolean;
};

export default function NewsCategoriesMultiSelect({
  selected,
  onChange,
  disabled,
}: NewsCategoriesMultiSelectProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const toggle = (cat: string, checked: boolean) => {
    onChange({ ...selected, [cat]: checked });
  };

  return (
    <div ref={wrapRef} className="relative mt-2">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="w-full px-3 py-2 border border-gray-300 bg-white text-sm text-left flex items-center justify-between disabled:opacity-60"
      >
        <span className="text-gray-700">Select an option</span>
        <span className="text-gray-500 text-xs">{open ? '▴' : '▾'}</span>
      </button>

      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-0 border border-gray-300 bg-white shadow-md max-h-64 overflow-y-auto">
          {PCU_NEWS_FOLLOW_CATEGORIES.map((cat) => (
            <label
              key={cat}
              className="flex items-center gap-2 px-3 py-2 text-sm border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={Boolean(selected[cat])}
                disabled={disabled}
                onChange={(e) => toggle(cat, e.target.checked)}
                className="rounded border-gray-400"
              />
              <span>{cat}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
